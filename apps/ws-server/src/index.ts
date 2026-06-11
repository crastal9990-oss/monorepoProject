import { Server } from '@hocuspocus/server'
import { Database } from '@hocuspocus/extension-database'
import { createClient } from '@supabase/supabase-js'
import { TiptapTransformer } from '@hocuspocus/transformer'
import * as Y from 'yjs'
import WebSocket from 'ws'
import 'dotenv/config'
import { extractTextFromJson, generateAITasksAndSave } from './utils'

// 内存节流记录：documentId -> 上次执行任务的时间戳
const lastExcerptGenerationTime = new Map<string, number>()
const EXCERPT_GENERATION_INTERVAL = 30 * 1000 // 30 秒 (摘要)

const lastEmbeddingGenerationTime = new Map<string, number>()
const EMBEDDING_GENERATION_INTERVAL = 5 * 60 * 1000 // 3 分钟 (向量切块)

// 环境变量校验
const requiredEnvVars = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ 缺少环境变量: ${envVar}`)
    process.exit(1)
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { autoRefreshToken: false, persistSession: false },
    realtime: { transport: WebSocket as any }
  }
)

const server = new Server({
  port: parseInt(process.env.PORT || '1234'),

  async onAuthenticate(data: any) {
    // 从 data 中解构出我们需要的真实属性 (Hocuspocus v4 中不再直接提供 connection 对象)
    const { token, documentName, connectionConfig } = data

    if (!token) throw new Error('拒绝访问：未提供令牌')

    const isJWT = token.split('.').length === 3

    if (isJWT) {
      // ----------------------------------------------------
      // 模式 A：正式登录用户
      // ----------------------------------------------------
      const { data: { user }, error: authError } = await supabase.auth.getUser(token)
      if (authError || !user) throw new Error('登录凭证已失效')

      console.log(`✅ 登录用户 ${user.email} 已连接`)
      return { user, role: 'owner' }

    } else {
      // ----------------------------------------------------
      // 模式 B：匿名访客（通过 Share Token 进来）
      // ----------------------------------------------------
      const { data: doc, error } = await supabase
        .from('documents')
        .select('share_token, share_permission')
        .eq('id', documentName)
        .eq('share_token', token)
        .single()

      if (error || !doc || doc.share_permission === 'none') {
        console.warn(`🚨 越权拦截：无效的分享链接访问 ${documentName}`)
        throw new Error('分享链接无效或已过期')
      }

      // ✨ 修复点：在 Hocuspocus v4 中，应该直接修改 connectionConfig 锁定写入权限
      if (doc.share_permission === 'viewer') {
        connectionConfig.readOnly = true
      }

      const guestId = `guest-${Math.random().toString(36).substring(2, 8)}`
      const guestUser = {
        id: guestId,
        email: 'anonymous@guest.local',
        user_metadata: {
          full_name: `访客_${guestId.split('-')[1]}`
        }
      }

      console.log(`👻 匿名访客 [${guestUser.user_metadata.full_name}] 已进入文档，权限: ${doc.share_permission}`)

      return { user: guestUser, role: doc.share_permission }
    }
  },

  extensions: [
    new Database({
      // 1. 获取数据：将 Postgres 的 Hex 字符串转换回 Uint8Array
      fetch: async ({ documentName }) => {
        const { data, error } = await supabase
          .from('documents')
          .select('yjs_state')
          .eq('id', documentName)
          .single()

        if (error) {
          if (error.code === 'PGRST116') {
            console.log(`📄 文档 ${documentName} 不存在，创建新文档`)
            return null
          }
          console.error(`读取文档失败: ${error.message}`)
          return null
        }

        if (!data?.yjs_state) return null

        // ✨ 修复点：将 "\x000102..." 字符串转换为 Uint8Array
        try {
          const hexString = data.yjs_state.startsWith('\\x')
            ? data.yjs_state.slice(2)
            : data.yjs_state;
          const stateBuffer = Buffer.from(hexString, 'hex');
          return new Uint8Array(stateBuffer);
        } catch (e) {
          console.error("解析 Yjs 数据失败", e);
          return null;
        }
      },

      // 2. 存储数据：将 Yjs 状态转回 Hex 字符串存入数据库
      store: async ({ documentName, document, instance }) => {
        try {
          // 生成 Yjs 二进制快照
          const state = Y.encodeStateAsUpdate(document)

          // 转换为 Supabase 认识的 \x 字符串格式
          const stateBuffer = Buffer.from(state)
          const hexString = `\\x${stateBuffer.toString('hex')}`

          // 把 Yjs 文档转换成 Tiptap 能认的 JSON
          const prosemirrorJson = TiptapTransformer.fromYdoc(document, 'default')

          // 提取纯文本 (替换掉容易报错的 tiptapGenerateText)
          const plainTextContent = extractTextFromJson(prosemirrorJson)

          // 异步触发 AI 任务 (双重火控节流)
          const now = Date.now()
          const lastExcerptTime = lastExcerptGenerationTime.get(documentName) || 0
          const lastEmbeddingTime = lastEmbeddingGenerationTime.get(documentName) || 0

          const shouldGenerateExcerpt = now - lastExcerptTime > EXCERPT_GENERATION_INTERVAL
          const shouldGenerateEmbedding = now - lastEmbeddingTime > EMBEDDING_GENERATION_INTERVAL

          if (shouldGenerateExcerpt || shouldGenerateEmbedding) {
            // 更新对应的时间戳
            if (shouldGenerateExcerpt) lastExcerptGenerationTime.set(documentName, now)
            if (shouldGenerateEmbedding) lastEmbeddingGenerationTime.set(documentName, now)

            // 抛出后台任务，不加 await，不阻塞主流程
            generateAITasksAndSave(documentName, plainTextContent, supabase, {
              excerpt: shouldGenerateExcerpt,
              embedding: shouldGenerateEmbedding
            })
          }

          // 更新数据库，保存二进制状态、JSON 内容、纯文本 (摘要字段由 AI 异步更新)
          const { error } = await supabase
            .from('documents')
            .update({
              yjs_state: hexString,
              content: prosemirrorJson,
              plain_content: plainTextContent,
              updated_at: new Date().toISOString(),
            })
            .eq('id', documentName)

          if (error) {
            console.error(`存储文档失败: ${error.message}`)
          } else {
            console.log(`💾 文档 ${documentName} 已保存，内容已同步`)
            const doc = instance.documents.get(documentName)
            if (doc) {
              doc.broadcastStateless(JSON.stringify({ type: 'document-saved', time: new Date().toISOString() }))
            }
          }
        } catch (error) {
          console.error(`store 回调异常: ${error}`)
        }
      },
    }),
  ],
})

server.listen().then(() => {
  console.log('🚀 Hocuspocus 协同服务已启动')
  console.log(`📡 WebSocket: ws://localhost:${process.env.PORT || 1234}`)
})