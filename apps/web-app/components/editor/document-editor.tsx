"use client"

import { useState, useEffect, useRef } from "react"
import { uploadImage, revalidateAfterEdit, moveDocumentToFolder } from "@/actions/document"
import { getFolderList } from "@/actions/folder"
import { toast, Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@repo/ui'
import { CollaborativeEditor } from '@repo/editor'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Users, Sparkles, Folder } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { useSearchParams } from 'next/navigation'
import ShareButton from './share-button'
import { AiAssistantPanel } from '@/components/layout/ai'
import { TableOfContents } from '@/components/layout/TableOfContents'

// 定义传入数据的类型
interface DocumentEditorProps {
  initialDocument: {
    id: string
    title: string
    content: string | null
    share_token: string
    share_permission: string
    user_id: string
    folder_id: string | null
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
  const [isAiOpen, setIsAiOpen] = useState(false)
  const [isSynced, setIsSynced] = useState(false)
  const [editorInstance, setEditorInstance] = useState<any>(null)

  const [folderId, setFolderId] = useState<string | null>(initialDocument.folder_id || null)
  const [folders, setFolders] = useState<any[]>([])

  const isOwner = currentUserId === initialDocument.user_id
  const isEditable = isOwner || initialDocument.share_permission === 'editor'

  // 加载用户文件夹列表
  useEffect(() => {
    getFolderList().then((res) => {
      if (res.success && res.data) {
        setFolders(res.data)
      }
    })
  }, [])

  const handleFolderChange = async (newFolderId: string) => {
    const targetFolderId = newFolderId === "root" ? null : newFolderId
    setFolderId(targetFolderId)
    const res = await moveDocumentToFolder(initialDocument.id, targetFolderId)
    if (res.success) {
      toast.success("成功移动文档")
      window.dispatchEvent(new CustomEvent('document-moved', {
        detail: { id: initialDocument.id, folder_id: targetFolderId }
      }))
    } else {
      toast.error(res.error || "移动文档失败")
      setFolderId(initialDocument.folder_id || null)
    }
  }

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

    // 发送全局事件，让侧边栏等其他组件能够实时同步标题
    window.dispatchEvent(new CustomEvent('document-updated', {
      detail: { id: initialDocument.id, title }
    }))

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
    // 清除 localStorage 缓存，下次打开列表页强制重新拉取
    localStorage.removeItem('all_notes_cache')
    localStorage.removeItem('dashboard_notes_cache')
    // 通知 Next.js 丢弃服务端缓存
    revalidateAfterEdit()
    router.back()
  }

  const saveStatusText = {
    saved: `最近更新 ${lastSavedAt.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`,
    saving: '正在保存...',
    error: '保存失败',
  }[saveStatus]

  return (
    <div className="flex h-[calc(100vh-56px)] lg:h-[calc(100vh-60px)] w-full overflow-hidden bg-background">
      {/* 侧边目录 (左侧)，未同步完成时隐藏以避免闪烁 */}
      <div className={`shrink-0 h-full transition-opacity duration-300 ${isSynced ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <TableOfContents editor={editorInstance} />
      </div>

      {/* 编辑器主体区域 */}
      <div id="editor-scroll-container" className="flex-1 flex flex-col h-full overflow-y-auto min-w-0 transition-all duration-300 relative">
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

              {/* AI 助手触发按钮 */}
              <button
                onClick={() => setIsAiOpen(!isAiOpen)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all shadow-sm ${isAiOpen
                    ? 'bg-primary text-primary-foreground border-primary hover:bg-primary/95'
                    : 'bg-background hover:bg-muted text-muted-foreground hover:text-foreground border-border/80'
                  }`}
              >
                <Sparkles className={`h-3.5 w-3.5 ${isAiOpen ? 'text-amber-300' : 'text-amber-500'}`} />
                AI 助手
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
                  <>
                    <ShareButton
                      documentId={initialDocument.id}
                      initialPermission={initialDocument.share_permission || 'none'}
                      shareToken={initialDocument.share_token}
                    />

                    {/* 文件夹选择器 */}
                    <div className="flex items-center gap-1.5 pl-2 border-l border-border/50 text-[13px] font-sans">
                      <Folder className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <Select
                        value={folderId || "root"}
                        onValueChange={(value) => handleFolderChange(value)}
                        disabled={!isEditable}
                      >
                        <SelectTrigger className="h-auto p-0 bg-transparent border-none outline-none text-muted-foreground hover:text-foreground focus:ring-0 shadow-none text-[13px] max-w-[120px] gap-1 data-[state=open]:text-foreground [&>svg]:opacity-50">
                          <SelectValue placeholder="选择分类" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="root">未分类</SelectItem>
                          {folders.map(f => (
                            <SelectItem key={f.id} value={f.id}>
                              {f.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
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
            className="flex-1 w-full px-6 lg:px-10 py-6 cursor-text relative"
            onClick={() => document.querySelector<HTMLElement>('.ProseMirror')?.focus()}
          >
            {authToken ? (
              <>
                {/* 骨架占位（当还没同步完成时显示） */}
                {!isSynced && (
                  <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 px-6 lg:px-10 py-6 pointer-events-none">
                    <div className="animate-pulse space-y-4">
                      <div className="h-5 bg-muted rounded w-3/4" />
                      <div className="h-5 bg-muted rounded w-full" />
                      <div className="h-5 bg-muted rounded w-5/6" />
                      <div className="h-5 bg-muted rounded w-2/3" />
                      <div className="h-5 bg-muted rounded w-full mt-8" />
                      <div className="h-5 bg-muted rounded w-4/5" />
                    </div>
                  </div>
                )}

                {/* 真正的编辑器，等同步完成后平滑显示出来 */}
                <div className={`transition-opacity duration-300 ${isSynced ? 'opacity-100' : 'opacity-0'}`}>
                  <CollaborativeEditor
                    documentId={initialDocument.id}
                    authToken={authToken}
                    wsServerUrl={WS_SERVER_URL}
                    userName={userName}
                    editable={isEditable}
                    highlightText={searchParams.get('highlight') || undefined}
                    onUsersChange={setOnlineUsers}
                    uploadFn={async (file) => {
                      const formData = new FormData()
                      formData.append('file', file)
                      return await uploadImage(formData)
                    }}
                    onEditorReady={setEditorInstance}
                    onStatusChange={(status, time) => {
                      if (status === 'synced') {
                        setIsSynced(true)
                      }
                      else if (status === 'connected') {
                        setSaveStatus('saved')
                        setLastSavedAt(new Date())
                      }
                      else if (status === 'disconnected') setSaveStatus('error')
                      else if (status === 'saved') {
                        setSaveStatus('saved')
                        if (time) setLastSavedAt(new Date(time))
                      }
                    }}
                    placeholder="开始输入正文，多人实时协同..."
                    className="prose prose-sm sm:prose-base dark:prose-invert focus:outline-none max-w-full min-h-[500px]"
                  />
                </div>
              </>
            ) : (
              // Token 加载中的骨架占位
              <div className="animate-pulse space-y-3 pt-4">
                <div className="h-5 bg-muted rounded w-3/4" />
                <div className="h-5 bg-muted rounded w-full" />
                <div className="h-5 bg-muted rounded w-5/6" />
                <div className="h-5 bg-muted rounded w-2/3" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 右侧 AI 助手面板 */}
      <AiAssistantPanel isOpen={isAiOpen} onClose={() => setIsAiOpen(false)} />
    </div>
  )
}