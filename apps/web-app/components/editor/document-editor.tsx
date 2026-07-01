"use client"

import { useState, useEffect, useRef } from "react"
import { uploadImage, revalidateAfterEdit, moveDocumentToFolder } from "@/actions/document"
import { getFolderList } from "@/actions/folder"
import { toast, Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Button } from '@repo/ui'
import { CollaborativeEditor } from '@repo/editor'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Users, Sparkles, Folder, FileText, ArrowRight, Loader2 } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { useSearchParams } from 'next/navigation'
import ShareButton from './share-button'
import { AiAssistantPanel } from '@/components/layout/ai'
import { TableOfContents } from '@/components/layout/TableOfContents'
import { loadMammoth, convertDocxToHtmlWithImages } from '@/utils/function/mammoth'

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
    is_word_raw?: boolean
    word_file_url?: string | null
    is_pdf_raw?: boolean
    pdf_file_url?: string | null
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
  const [isConverting, setIsConverting] = useState(false)

  const isOwner = currentUserId === initialDocument.user_id
  const isEditable = isOwner || initialDocument.share_permission === 'editor'
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | 'offline'>('saved')

  // 加载用户文件夹列表
  useEffect(() => {
    getFolderList().then((res) => {
      if (res.success && res.data) {
        setFolders(res.data)
      }
    })
  }, [])

  // 初始化加载可能存在的离线标题
  useEffect(() => {
    const offlineTitle = localStorage.getItem(`offline_title_${initialDocument.id}`)
    if (offlineTitle && offlineTitle !== initialDocument.title) {
      setTitle(offlineTitle)
    }
  }, [initialDocument.id, initialDocument.title])

  // 监听全局网络状态，实现精准的离线/上线提示
  useEffect(() => {
    const handleOffline = () => {
      setSaveStatus('offline')
      toast.info('网络已断开，将开启本地保存', { id: 'network-status', duration: 4000 })
    }
    const handleOnline = () => {
      setSaveStatus('saved')
      toast.success('网络已恢复，数据已自动同步', { id: 'network-status', duration: 3000 })
      // 网络恢复时，同步离线保存的标题
      const offlineTitle = localStorage.getItem(`offline_title_${initialDocument.id}`)
      if (offlineTitle) {
        const supabase = createClient()
        supabase
          .from('documents')
          .update({ title: offlineTitle, updated_at: new Date().toISOString() })
          .eq('id', initialDocument.id)
          .then(({ error }) => {
            if (!error) localStorage.removeItem(`offline_title_${initialDocument.id}`)
          })
      }
    }
    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      handleOffline()
    }
    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [])

  // 监听协同同步状态，如果是刚导入的数据，将其填入编辑器中
  useEffect(() => {
    if (isSynced && editorInstance) {
      const importContent = sessionStorage.getItem(`import_content_${initialDocument.id}`)
      if (importContent) {
        editorInstance.commands.setContent(importContent)
        sessionStorage.removeItem(`import_content_${initialDocument.id}`)
        toast.success("内容导入成功")
      }
    }
  }, [isSynced, editorInstance, initialDocument.id])

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

  // 转换为在线文档
  const handleConvertToOnline = async () => {
    const fileUrl = initialDocument.word_file_url
    if (!fileUrl) {
      toast.error("未找到 Word 原始文件 URL")
      return
    }
    setIsConverting(true)
    try {
      // 1. 获取云端 Word 文件的原始二进制数据流
      const response = await fetch(fileUrl)
      if (!response.ok) throw new Error("无法从存储桶中获取 Word 文件")
      const arrayBuffer = await response.arrayBuffer()

      // 2. 调用公共解析工具，将 docx 解析为 HTML 并自动将图片上传至 Supabase Storage
      const htmlContent = await convertDocxToHtmlWithImages(arrayBuffer)

      // 3. 将转换后的 HTML 暂存至 sessionStorage 中，供协同编辑器挂载后载入
      sessionStorage.setItem(`import_content_${initialDocument.id}`, htmlContent)

      // 4. 更新 Supabase 数据库状态，标记文档已转为在线文档
      const supabase = createClient()
      const { error } = await supabase
        .from('documents')
        .update({
          is_word_raw: false,
          word_file_url: null
        })
        .eq('id', initialDocument.id)

      if (error) throw error

      toast.success("成功转换为在线文档，正在载入编辑器...")

      // 5. 刷新页面，重新拉取状态并正式挂载 TipTap 编辑器
      window.location.reload()
    } catch (err: any) {
      console.error("转换在线文档失败:", err)
      toast.error(err.message || "转换失败，请稍后重试")
    } finally {
      setIsConverting(false)
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
      if (!navigator.onLine) {
        setSaveStatus('offline')
        // 离线时保存到 localStorage
        localStorage.setItem(`offline_title_${initialDocument.id}`, title)
        return
      }
      // 在线时如果有历史缓存则清理掉
      localStorage.removeItem(`offline_title_${initialDocument.id}`)
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
    offline: '🌥️ 离线(修改已存本地)',
  }[saveStatus]

  return (
    <div className="flex h-[calc(100vh-56px)] lg:h-[calc(100vh-60px)] w-full overflow-hidden bg-background">
      {/* 侧边目录 (左侧)，未同步完成时隐藏以避免闪烁。若是 Word 原始预览状态或 PDF 原始状态则隐藏 */}
      {!initialDocument.is_word_raw && !initialDocument.is_pdf_raw && (
        <div className={`shrink-0 h-full transition-opacity duration-300 ${isSynced ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <TableOfContents editor={editorInstance} />
        </div>
      )}

      {/* 编辑器主体区域 */}
      <div
        id="editor-scroll-container"
        className={`flex-1 flex flex-col h-full min-w-0 transition-all duration-300 relative ${initialDocument.is_word_raw || initialDocument.is_pdf_raw ? 'overflow-hidden' : 'overflow-y-auto'
          }`}
      >
        {initialDocument.is_word_raw ? (
          // Word 预览模式
          <div className="flex flex-col h-full w-full relative">
            {/* 极简顶栏：融合返回按钮、文件名展示和“转为在线文档”操作按钮 (全宽) */}
            <div className="w-full bg-background border-b border-border/80 px-6 lg:px-10 py-3 flex items-center justify-between gap-4 shrink-0 shadow-sm z-20">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={handleBack}
                  className="flex items-center text-muted-foreground hover:text-foreground transition-colors text-sm shrink-0 mr-1 font-medium"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  返回
                </button>
                <div className="h-4 w-px bg-border shrink-0" />
                <FileText className="h-4 w-4 text-primary shrink-0" />
                <span className="text-sm font-semibold text-foreground truncate max-w-[200px] sm:max-w-[400px]">
                  {title}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-muted text-muted-foreground font-medium shrink-0">
                  Word 预览
                </span>
              </div>

              <Button
                type="button"
                disabled={isConverting}
                onClick={handleConvertToOnline}
                className="shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-xs px-4 py-2 rounded-lg gap-2 shadow-sm flex items-center h-8"
              >
                {isConverting ? (<><Loader2 className="h-3.5 w-3.5 animate-spin" />正在转换...</>) : (
                  <>转换为在线文档<ArrowRight className="h-3.5 w-3.5" /></>
                )}
              </Button>
            </div>

            {/* 全屏 Iframe 容器 */}
            <div className="flex-1 w-full bg-muted/5 relative">
              <iframe
                src={`https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(initialDocument.word_file_url || "")}`}
                className="w-full h-full border-0 absolute inset-0"
                title="Word Preview"
              />
            </div>
          </div>
        ) : initialDocument.is_pdf_raw ? (
          // PDF 预览模式
          <div className="flex flex-col h-full w-full relative">
            {/* 极简顶栏：融合返回按钮、文件名展示和“在新标签页打开”操作按钮 (全宽) */}
            <div className="w-full bg-background border-b border-border/80 px-6 lg:px-10 py-3 flex items-center justify-between gap-4 shrink-0 shadow-sm z-20">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={handleBack}
                  className="flex items-center text-muted-foreground hover:text-foreground transition-colors text-sm shrink-0 mr-1 font-medium"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  返回
                </button>
                <div className="h-4 w-px bg-border shrink-0" />
                <FileText className="h-4 w-4 text-primary shrink-0" />
                <span className="text-sm font-semibold text-foreground truncate max-w-[200px] sm:max-w-[400px]">
                  {title}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-muted text-muted-foreground font-medium shrink-0">
                  PDF 预览
                </span>
              </div>

              <Button
                asChild
                variant="outline"
                className="shrink-0 font-medium text-xs px-4 py-2 rounded-lg gap-2 shadow-sm flex items-center h-8"
              >
                <a href={initialDocument.pdf_file_url || ""} target="_blank" rel="noopener noreferrer">
                  在新标签页打开
                </a>
              </Button>
            </div>

            {/* 全屏 Iframe 容器 */}
            <div className="flex-1 w-full bg-muted/5 relative">
              <iframe
                src={initialDocument.pdf_file_url || ""}
                className="w-full h-full border-0 absolute inset-0"
                title="PDF Preview"
              />
            </div>
          </div>
        ) : (
          // 协同编辑器模式
          <div className="flex flex-col h-full max-w-5xl mx-auto w-full relative">
            {/* 顶部固定区域 */}
            <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm pt-6 lg:pt-10 px-6 lg:px-10 pb-4 border-b border-transparent transition-all">
              <div className="flex items-center justify-between mb-6">
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
                  className="flex-1 text-4xl font-bold border-none outline-none bg-transparent text-foreground placeholder:text-muted-foreground/50 focus:ring-0 min-w-0 p-0 disabled:opacity-80 disabled:cursor-not-allowed"
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
              className="flex-1 w-full px-6 lg:px-10 py-6 cursor-text relative animate-in fade-in duration-300"
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
                        else if (status === 'disconnected') {
                          setSaveStatus('offline')
                        }
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
        )}
      </div>

      {/* 右侧 AI 助手面板 */}
      <AiAssistantPanel isOpen={isAiOpen} onClose={() => setIsAiOpen(false)} />
    </div>
  )
}