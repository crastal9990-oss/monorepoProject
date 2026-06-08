"use client"

import { useState, useEffect, useRef } from "react"
import { uploadImage, revalidateAfterEdit } from "@/api/document"
import { toast } from '@repo/ui'
import { CollaborativeEditor } from '@repo/editor'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Users } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { useSearchParams } from 'next/navigation' //引入读取 URL 参数的钩子
import ShareButton from './share-button'

// 定义传入数据的类型
interface DocumentEditorProps {
  initialDocument: {
    id: string
    title: string
    content: string | null
    share_token: string
    share_permission: string
    user_id: string
  }
}

// ws-server 地址（生产环境通过环境变量注入）
const WS_SERVER_URL = process.env.NEXT_PUBLIC_WS_SERVER_URL || 'ws://localhost:1234'

export default function DocumentEditor({ initialDocument }: DocumentEditorProps) {
  const router = useRouter()
  // 读取 URL 里的 token，例如：/notes/123?token=abc-123
  const searchParams = useSearchParams()
  const shareToken = searchParams.get('token')

  const [title, setTitle] = useState(initialDocument.title)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved')
  const [lastSavedAt, setLastSavedAt] = useState<Date>(new Date())
  const [onlineUsers, setOnlineUsers] = useState<number>(1)
  const [authToken, setAuthToken] = useState<string | null>(null)
  const [userName, setUserName] = useState<string>('匿名用户')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const isOwner = currentUserId === initialDocument.user_id
  const isEditable = isOwner || initialDocument.share_permission === 'editor'

  // ── 获取 Supabase Session Token，用于 Hocuspocus 鉴权 ──────────────────────
  useEffect(() => {
    const supabase = createClient()

    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        // 如果用户登录了，优先用 JWT
        setAuthToken(session.access_token)
        setCurrentUserId(session.user.id)
        const displayName =
          session.user.user_metadata?.full_name ||
          session.user.email?.split('@')[0] ||
          '匿名用户'
        setUserName(displayName) // 用邮箱前缀或 metadata 里的名字作为光标显示名
      } else if (shareToken) {
        // 如果没有登录，但是 URL 里有 shareToken，就把这个当做令牌！
        setAuthToken(shareToken)
        setUserName(`访客_${Math.floor(Math.random() * 1000)}`) // 给个本地默认名字
      } else {
        // 没登录也没 token，直接弹回首页或提示无权访问
        console.error("无权限访问")
        router.replace('/login')
      }
    }

    fetchSession()

    // 监听 token 刷新，保持 token 始终最新
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setAuthToken(session.access_token)
      } else if (!shareToken) {
        // 仅在没有 shareToken 的情况下才清空 token
        setAuthToken(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // ── 标题的独立保存（协同模式下，正文由 Hocuspocus 处理，标题仍走 HTTP）──────
  const titleSaveTimer = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (title === initialDocument.title) return

    setSaveStatus('saving')
    if (titleSaveTimer.current) clearTimeout(titleSaveTimer.current)

    titleSaveTimer.current = setTimeout(async () => {
      try {
        const supabase = createClient()
        const { error } = await supabase
          .from('documents')
          .update({ title, updated_at: new Date().toISOString() })
          .eq('id', initialDocument.id)

        if (error) throw error
        setSaveStatus('saved')
        setLastSavedAt(new Date())
      } catch (err) {
        setSaveStatus('error')
        toast.error('标题保存失败')
      }
    }, 1500)

    return () => { if (titleSaveTimer.current) clearTimeout(titleSaveTimer.current) }
  }, [title])

  const handleBack = async () => {
    // ✅ 清除 localStorage 缓存，下次打开列表页强制重新拉取
    localStorage.removeItem('all_notes_cache')
    localStorage.removeItem('dashboard_notes_cache')
    // ✅ 通知 Next.js 丢弃服务端缓存
    await revalidateAfterEdit()
    router.back()
  }

  const saveStatusText = {
    saved: `最近更新 ${lastSavedAt.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`,
    saving: '正在保存...',
    error: '保存失败',
  }[saveStatus]

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto w-full relative">
      {/* 顶部固定区域 */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm pt-6 lg:pt-10 px-6 lg:px-10 pb-4 border-b border-transparent transition-all">
        {/* 顶部操作区 */}
        <div className="flex items-center justify-between mb-6">
          {/* 返回按钮 */}
          <button
            onClick={handleBack}
            className="flex items-center text-muted-foreground hover:text-foreground transition-colors text-sm w-fit"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            返回
          </button>
        </div>

        {/* 标题输入区和在线人数 */}
        <div className="flex items-center gap-4 mb-6">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={!isEditable}
            placeholder="请输入标题"
            className="flex-1 text-4xl font-bold border-none outline-none bg-transparent text-foreground placeholder:text-muted-foreground/50 focus:ring-0 min-w-0 disabled:opacity-80 disabled:cursor-not-allowed"
          />
          {onlineUsers > 1 && (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary font-medium text-sm whitespace-nowrap">
              <Users className="w-4 h-4" />
              {onlineUsers} 人在线
            </span>
          )}
        </div>

        {/* 文档 ID 和保存状态 */}
        <div className="flex items-center justify-between text-sm text-muted-foreground font-mono">
          <div className="flex items-center gap-3">
            <span>ID: {initialDocument.id.split('-')[0]}</span>
            {isOwner && (
              <ShareButton
                documentId={initialDocument.id}
                initialPermission={initialDocument.share_permission || 'none'}
                shareToken={initialDocument.share_token}
              />
            )}
            {!isEditable && (
              <span className="px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground font-medium">只读模式</span>
            )}
          </div>
          <span className="flex items-center gap-2">
            {saveStatus === 'saving' && (
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            )}
            {saveStatusText}
          </span>
        </div>
      </div>

      {/* 协同编辑器区域 */}
      <div
        className="flex-1 w-full px-6 lg:px-10 py-6 cursor-text"
        onClick={() => document.querySelector<HTMLElement>('.ProseMirror')?.focus()}
      >
        {authToken ? (
          <CollaborativeEditor
            documentId={initialDocument.id}
            authToken={authToken}
            wsServerUrl={WS_SERVER_URL}
            userName={userName}
            editable={isEditable}
            onUsersChange={setOnlineUsers}
            uploadFn={async (file) => {
              const formData = new FormData()
              formData.append('file', file)
              return await uploadImage(formData)
            }}
            onStatusChange={(status) => {
              if (status === 'connected') {
                setSaveStatus('saved')
                setLastSavedAt(new Date())
              }
              else if (status === 'disconnected') setSaveStatus('error')
            }}
            placeholder="开始输入正文，多人实时协同..."
            className="prose prose-sm sm:prose-base dark:prose-invert focus:outline-none max-w-full min-h-[500px]"
          />
        ) : (
          // Token 加载中的骨架占位
          <div className="animate-pulse space-y-3 pt-4">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-5/6" />
            <div className="h-4 bg-muted rounded w-2/3" />
          </div>
        )}
      </div>
    </div>
  )
}