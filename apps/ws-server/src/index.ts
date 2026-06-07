import { Server } from '@hocuspocus/server'
import { Database } from '@hocuspocus/extension-database'
import { createClient } from '@supabase/supabase-js'
import { TiptapTransformer } from '@hocuspocus/transformer'
import { generateText } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import * as Y from 'yjs'
import WebSocket from 'ws'
import 'dotenv/config'

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

  async onAuthenticate({ token }) {
    if (!token) throw new Error('缺少认证 token')

    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) {
      console.warn(`鉴权失败: ${error?.message}`)
      throw new Error('鉴权失败，拒绝连接')
    }

    console.log(`✅ 用户 ${user.id} 已连接`)
    return { user }
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
      store: async ({ documentName, document }) => {
        try {
          // 生成 Yjs 二进制快照
          const state = Y.encodeStateAsUpdate(document)

          // 转换为 Supabase 认识的 \x 字符串格式
          const stateBuffer = Buffer.from(state)
          const hexString = `\\x${stateBuffer.toString('hex')}`

          // 把 Yjs 文档转换成 Tiptap 能认的 JSON
          const prosemirrorJson = TiptapTransformer.fromYdoc(document, 'default')
          
          // 提取纯文本
          const plainTextContent = generateText(prosemirrorJson, [StarterKit as any])
          // 生成摘要 (取前80字)
          const excerpt = plainTextContent.replace(/\n+/g, ' ').trim().substring(0, 80) + (plainTextContent.length > 80 ? '...' : '')

          // 更新数据库，保存二进制状态、JSON 内容、纯文本和摘要
          const { error } = await supabase
            .from('documents')
            .update({
              yjs_state: hexString,
              content: prosemirrorJson, // ✅ 修复：直接存 JSON，不在 Node 环境强行生成 HTML 导致 window is not defined
              plain_content: plainTextContent,
              excerpt: excerpt || '无内容',
              updated_at: new Date().toISOString(),
            })
            .eq('id', documentName)

          if (error) {
            console.error(`存储文档失败: ${error.message}`)
          } else {
            console.log(`💾 文档 ${documentName} 已保存，内容已同步`)
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