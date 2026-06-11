"use client"

import { useEditor, EditorContent, Extension } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import TextAlign from '@tiptap/extension-text-align'
import { Color } from '@tiptap/extension-color'
import { TextStyle } from '@tiptap/extension-text-style'
import Highlight from '@tiptap/extension-highlight'
import Image from '@tiptap/extension-image'
import Collaboration from '@tiptap/extension-collaboration'
import CollaborationCaret from '@tiptap/extension-collaboration-caret'
import { HocuspocusProvider } from '@hocuspocus/provider'
import * as Y from 'yjs'
import { useEffect, useState, useRef } from 'react'
import './editor.css'
import {
  Bold, Italic, Strikethrough,
  Underline as UnderlineIcon,
  Link as LinkIcon,
  Code, AlignLeft, AlignCenter,
  AlignRight, AlignJustify, Type, Baseline,
  ChevronDown, Eraser, X,
  WandSparkles, Loader2, Check // 🌟 新增 AI 相关图标
} from 'lucide-react'
import './editor.css'
import { useImageUpload } from './hooks/use-image-upload'

import './editor.css'
import { toast } from '@repo/ui'
import { TableOfContents } from '@tiptap/extension-table-of-contents'
import { Button } from "@repo/ui"
import { AiHighlightExtension } from './extension/ai-highlight'

export interface CollaborativeEditorProps {
  documentId: string
  authToken: string
  wsServerUrl: string
  userName?: string
  userColor?: string
  uploadFn?: (file: File) => Promise<string | null>
  className?: string
  placeholder?: string
  onStatusChange?: (status: 'connecting' | 'connected' | 'disconnected' | 'saved', time?: string) => void
  onUsersChange?: (count: number) => void
  editable?: boolean
  onTocUpdate?: (toc: any[]) => void
  onEditorReady?: (editor: any) => void
  highlightText?: string
}

// ─── 工具子组件 ────────────────────────────────────────────────────────────────

const Tooltip = ({ children, text }: { children: React.ReactNode; text: string }) => {
  const [show, setShow] = useState(false)
  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded whitespace-nowrap z-50 pointer-events-none">
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700" />
        </div>
      )}
    </div>
  )
}

const MenuButton = ({ onClick, isActive, children, title }: any) => (
  <Tooltip text={title}>
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      className={`p-2 flex items-center justify-center text-sm rounded-md transition-all duration-200 ${isActive
        ? 'bg-gray-200 dark:bg-gray-700 text-foreground shadow-sm'
        : 'hover:bg-muted text-muted-foreground hover:text-foreground hover:shadow-sm'
        }`}
    >
      {children}
    </button>
  </Tooltip>
)

const Divider = () => <div className="w-px h-5 bg-border mx-0.5" />;

const TEXT_COLORS = [
  '#18181b', '#71717a', '#ef4444', '#f97316', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6',
];

const BG_COLORS = [
  'transparent', '#f4f4f5', '#fee2e2', '#ffedd5', '#fef9c3', '#dcfce7', '#dbeafe',
  '#ede9fe', '#e4e4e7', '#27272a', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6',
  '#8b5cf6',
];

const ClearMarksOnEnter = Extension.create({
  name: 'clearMarksOnEnter',
  priority: 1000,
  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => {
        if (editor.can().splitListItem('listItem')) {
          return editor.chain().splitListItem('listItem').unsetAllMarks().run()
        }
        return editor.chain().splitBlock({ keepMarks: false }).unsetAllMarks().run()
      },
    }
  },
})

// ─── 主组件 ───────────────────────────────────────────────────────────────────

export function CollaborativeEditor({
  documentId,
  authToken,
  wsServerUrl,
  userName = '匿名用户',
  userColor,
  uploadFn,
  className,
  placeholder,
  onStatusChange,
  onUsersChange,
  editable = true,
  onTocUpdate,
  onEditorReady,
  highlightText,
}: CollaborativeEditorProps) {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const [linkUrl, setLinkUrl] = useState<string>('')
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')
  const [onlineUsers, setOnlineUsers] = useState<number>(0)
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  const { handlePaste, handleDrop } = useImageUpload(uploadFn)

  const [isAIGenerating, setIsAIGenerating] = useState(false) // 记录 AI 是否正在流式输出
  // AI预览状态，用于存储原始文本、生成内容的起始位置和结束位置
  const [aiPreviewState, setAiPreviewState] = useState<{
    originalText: string;
    from: number;
    to: number;
  } | null>(null)
  const [previewCoords, setPreviewCoords] = useState<{ top: number, left: number } | null>(null)
  // 创建 Yjs 文档（只创建一次）
  const ydocRef = useRef<Y.Doc | null>(null)
  if (!ydocRef.current) {
    ydocRef.current = new Y.Doc()
  }
  const ydoc = ydocRef.current

  // ── Provider 生命周期管理 ────────────────────────────────────────────────────
  const onUsersChangeRef = useRef(onUsersChange)
  const onStatusChangeRef = useRef(onStatusChange)

  useEffect(() => {
    onUsersChangeRef.current = onUsersChange
    onStatusChangeRef.current = onStatusChange
  })

  // 1. 初始状态为 null
  const [provider, setProvider] = useState<HocuspocusProvider | null>(null)

  // 2. 在 useEffect 中安全地创建和销毁
  useEffect(() => {
    const newProvider = new HocuspocusProvider({
      url: wsServerUrl,
      name: documentId,
      document: ydoc,
      token: authToken,
      onConnect: () => {
        setConnectionStatus('connected')
        onStatusChangeRef.current?.('connected')
      },
      onDisconnect: () => {
        setConnectionStatus('disconnected')
        onStatusChangeRef.current?.('disconnected')
      },
      onStateless: ({ payload }) => {
        try {
          const msg = typeof payload === 'string' ? JSON.parse(payload) : payload
          if (msg.type === 'document-saved') {
            onStatusChangeRef.current?.('saved', msg.time)
          }
        } catch (e) {
          console.error('Failed to parse stateless message', e)
        }
      },
      onAwarenessUpdate: ({ states }) => {
        setOnlineUsers(states.length)
        onUsersChangeRef.current?.(states.length)
      },
    })

    setProvider(newProvider)

    // 只有组件真正卸载时，才销毁它
    return () => {
      newProvider.destroy()
    }
  }, [wsServerUrl, documentId, authToken, ydoc])

  // 3. 同步用户名字和颜色的逻辑，也要加个判空
  useEffect(() => {
    if (provider) {
      provider.setAwarenessField('user', {
        name: isAIGenerating ? `${userName} + AI` : userName,
        color: isAIGenerating ? '#a855f7' : (userColor || '#f783ac')
      })
    }
  }, [provider, userName, userColor, isAIGenerating])

  // ── 图片预览滚动锁 ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (previewImage) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [previewImage])

  // ── 编辑器实例 ────────────────────────────────────────────────────────────────
  const editor = useEditor({
    editable,
    extensions: [
      ClearMarksOnEnter,
      // ✅ 协同模式：Tiptap v3 StarterKit 不再内置 history，直接使用即可
      // Yjs Collaboration 扩展会自动接管 undo/redo
      StarterKit,
      // ✅ Yjs 协同核心
      Collaboration.configure({ document: ydoc }),
      AiHighlightExtension, // 高亮
      ...(provider ? [
        CollaborationCaret.configure({
          provider: provider,
          user: {
            name: userName,
            color: userColor || '#f783ac',
          },
        })
      ] : []),
      Placeholder.configure({
        placeholder: placeholder || '写点什么，你的团队会实时看到...',
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-500 no-underline hover:underline cursor-pointer',
        },
      }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Image.configure({
        inline: true,
        HTMLAttributes: {
          class: 'rounded-lg max-w-full mx-auto border border-border/50 align-middle cursor-zoom-in hover:ring-2 hover:ring-primary hover:ring-offset-2 hover:ring-offset-background transition-all',
        },
      }),
      TableOfContents.configure({
        anchorTypes: ['heading'], // 指定哪些节点作为目录锚点，默认就是 'heading'
        onUpdate: (content) => {
          onTocUpdate?.(content)
        }
      }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: className || 'prose prose-sm sm:prose-base dark:prose-invert focus:outline-none max-w-full min-h-[500px] px-4 pt-8 pb-4',
      },
      handlePaste,
      handleDrop,
      handleClickOn: (_view: any, _pos: any, node: any) => {
        if (node.type.name === 'image') {
          setPreviewImage(node.attrs.src)
          return true
        }
        return false
      },
    },
  }, [provider, userName, userColor])

  useEffect(() => {
    if (editor && onEditorReady) {
      onEditorReady(editor)
    }
  }, [editor, onEditorReady])

  // 1. 监听自定义事件定位并高亮当前文档正文
  useEffect(() => {
    if (!editor) return

    const handleHighlight = (e: any) => {
      const { text } = e.detail
      if (!text) return

      const { state, view } = editor

      // 查找对应文本的位置（ProseMirror 绝对位置）
      let pos = -1
      state.doc.descendants((node, position) => {
        if (node.isText && node.text && node.text.includes(text)) {
          const relativeIndex = node.text.indexOf(text)
          pos = position + relativeIndex
          return false // 停止遍历
        }
        return true
      })

      // 如果精确匹配找不到，做一下前30个字符局部匹配
      if (pos === -1) {
        const snippet = text.slice(0, 30).trim()
        if (snippet.length > 5) {
          state.doc.descendants((node, position) => {
            if (node.isText && node.text && node.text.includes(snippet)) {
              pos = position + node.text.indexOf(snippet)
              return false
            }
            return true
          })
        }
      }

      if (pos !== -1) {
        // 选中这段文本
        editor.chain().focus().setTextSelection({ from: pos, to: pos + text.length }).run()

        // 触发本地的临时闪烁高亮 Decoration（不会被 Yjs 覆盖，也不会被其它人看到）
        editor.commands.setAiHighlight({ from: pos, to: pos + text.length })
        setTimeout(() => {
          if (!editor.isDestroyed) {
            editor.commands.clearAiHighlight()
          }
        }, 2500)

        // 滚动定位到可视区域
        setTimeout(() => {
          const domNode = view.nodeDOM(pos) as HTMLElement | null
          if (domNode) {
            domNode.scrollIntoView({ behavior: 'smooth', block: 'center' })
          } else {
            view.dispatch(state.tr.scrollIntoView())
          }
        }, 100)
      } else {
        toast.error('未在当前文档正文中找到该引用片段')
      }
    }

    window.addEventListener('ai-highlight-text' as any, handleHighlight)
    return () => {
      window.removeEventListener('ai-highlight-text' as any, handleHighlight)
    }
  }, [editor])

  // 2. 检测传入的 highlightText 参数并在编辑器加载/同步完成后自动定位高亮
  useEffect(() => {
    if (!editor || connectionStatus !== 'connected' || !highlightText) return

    // 延迟 800ms 等待 Yjs 协同文档完成初始内容同步
    const timer = setTimeout(() => {
      const event = new CustomEvent('ai-highlight-text', {
        detail: { text: highlightText }
      })
      window.dispatchEvent(event)

      // 清除 URL 中的 highlight 参数，避免下次刷新页面重复高亮
      const newUrl = window.location.pathname
      window.history.replaceState({}, '', newUrl)
    }, 800)

    return () => clearTimeout(timer)
  }, [editor, connectionStatus, highlightText])

  const toggleDropdown = (name: string) => {
    setActiveDropdown(prev => prev === name ? null : name)
  }
  const closeDropdown = () => setActiveDropdown(null)

  const setLink = () => {
    if (linkUrl === '') {
      editor?.chain().focus().extendMarkRange('link').unsetLink().run()
    } else {
      editor?.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run()
    }
    closeDropdown()
    closeDropdown()
  }

  // 监听预览状态并更新浮浮窗位置
  useEffect(() => {
    if (aiPreviewState && editor) {
      const updateCoords = () => {
        try {
          const coords = editor.view.coordsAtPos(aiPreviewState.to)
          const wrapper = editor.view.dom.closest('.tiptap-wrapper') as HTMLElement
          if (wrapper) {
            const rect = wrapper.getBoundingClientRect()
            setPreviewCoords({
              top: coords.bottom - rect.top + 10,
              left: Math.max(0, coords.left - rect.left - 100)
            })
          }
        } catch (e) {
          console.error(e)
        }
      }
      updateCoords()
    } else {
      setPreviewCoords(null)
    }
  }, [aiPreviewState, editor])

  const handleAcceptAI = () => {
    if (!editor || !aiPreviewState) return
    editor.chain().focus()
      .setTextSelection({ from: aiPreviewState.from, to: aiPreviewState.to })
      .unsetHighlight()
      .run()

    editor.chain().focus().setTextSelection(editor.state.selection.to).run()
    setAiPreviewState(null)
  }

  const handleRejectAI = () => {
    if (!editor || !aiPreviewState) return
    editor.chain().focus()
      .deleteRange({ from: aiPreviewState.from, to: aiPreviewState.to })
      .insertContent(aiPreviewState.originalText)
      .run()

    setAiPreviewState(null)
  }

  // 🌟 核心新增：AI 流式替换逻辑
  const handleAIAction = async (actionType: string) => {
    if (!editor) return

    const { from, to } = editor.state.selection
    const selectedText = editor.state.doc.textBetween(from, to, ' ')

    if (!selectedText) return

    closeDropdown()
    setIsAIGenerating(true)

    try {
      // 1. 发起真实的网络请求（此时保留原文本，不提前删除）
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: selectedText, action: actionType })
      })

      if (!response.ok) throw new Error('网络请求失败')

      // 2. 核心：解析底层的 ReadableStream
      const reader = response.body?.getReader()
      const decoder = new TextDecoder('utf-8')
      let isFirstChunk = true

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          if (chunk) {
            // 当接收到真正的第一段数据包时，才把原文删掉
            if (isFirstChunk) {
              editor.chain().focus().deleteRange({ from, to }).setHighlight({ color: '#f3e8ff' }).insertContent(chunk).run()
              isFirstChunk = false
            } else {
              // 后续的数据包直接在光标处追加
              editor.commands.insertContent(chunk)
            }
          }
        }

        const endPos = editor.state.selection.to
        editor.chain().focus().setTextSelection({ from, to: endPos }).run()

        setAiPreviewState({
          originalText: selectedText,
          from,
          to: endPos
        })
      }
    } catch (error) {
      toast.error('AI 生成失败，请重试')
      console.error(error)
    } finally {
      setIsAIGenerating(false)
    }
  }

  return (
    <>
      <div
        className="tiptap-wrapper relative rounded-md overflow-visible bg-background"
        onMouseLeave={closeDropdown}
        onKeyDownCapture={(e) => {
          if (isAIGenerating || aiPreviewState) {
            e.preventDefault()
            e.stopPropagation()
          }
        }}
      >
        {/* 在 AI 生成期间和等待确认期间显示一个透明遮罩，拦截所有鼠标点击和选择，防止焦点乱跑 */}
        {(isAIGenerating || aiPreviewState) && (
          <div
            className="absolute inset-0 z-[40]"
            onMouseDown={(e) => {
              e.preventDefault()
              e.stopPropagation()
            }}
          />
        )}
        {/* AI 接受/拒绝的悬浮菜单 */}
        {aiPreviewState && previewCoords && (
          <div
            className="absolute z-50 flex items-center gap-1.5 p-1 bg-popover border text-popover-foreground shadow-md rounded-md animate-in fade-in zoom-in-95"
            style={{ top: previewCoords.top, left: previewCoords.left }}
          >
            <div className="flex items-center gap-1 pr-1">
              <Button
                onClick={handleAcceptAI}
                variant="ghost"
                size="sm"
                className="h-7 px-2.5 text-emerald-600 dark:text-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-500/15 transition-colors"
              >
                <Check className="w-3.5 h-3.5 mr-1" />
                接受
              </Button>

              <Button
                onClick={handleRejectAI}
                variant="ghost"
                size="sm"
                className="h-7 px-2.5 text-red-600 dark:text-red-500 hover:text-red-700 dark:hover:text-red-400 hover:bg-red-500/15 transition-colors"
              >
                <X className="w-3.5 h-3.5 mr-1" />
                拒绝
              </Button>
            </div>
          </div>
        )}
        {editor && (
          <BubbleMenu
            editor={editor}
            options={{ placement: 'top' }}
            shouldShow={({ from, to }) => from !== to && !editor.isActive('image') && !aiPreviewState}
            className="flex items-center gap-0.5 bg-background border border-border shadow-xl rounded-xl overflow-visible p-1.5 z-50"
          >
            {/* 标题 */}
            <div className="relative">
              <Tooltip text="设置标题格式">
                <button
                  onMouseDown={(e) => { e.preventDefault(); toggleDropdown('heading'); }}
                  className="flex items-center gap-1 p-2 text-sm hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Type className="w-4 h-4" />
                  <ChevronDown className="w-3 h-3" />
                </button>
              </Tooltip>
              {activeDropdown === 'heading' && (
                <div className="absolute top-full left-0 mt-1 bg-background border border-border shadow-lg rounded-lg py-1 flex flex-col w-36 z-50 overflow-hidden">
                  {[
                    { label: '正文', level: 0 },
                    { label: '标题 1', level: 1 },
                    { label: '标题 2', level: 2 },
                    { label: '标题 3', level: 3 },
                    { label: '标题 4', level: 4 },
                  ].map((item) => (
                    <button
                      key={item.label}
                      onMouseDown={(e) => {
                        e.preventDefault()
                        if (item.level === 0) {
                          editor.chain().focus().setParagraph().run()
                        } else {
                          editor.chain().focus().toggleHeading({ level: item.level as any }).run()
                        }
                        closeDropdown()
                      }}
                      className={`px-4 py-2 text-left text-sm hover:bg-muted transition-colors ${(item.level === 0 ? editor.isActive('paragraph') : editor.isActive('heading', { level: item.level }))
                        ? 'bg-gray-200 dark:bg-gray-800 text-foreground font-medium'
                        : 'text-foreground'
                        }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Divider />

            {/* 对齐 */}
            <div className="relative">
              <Tooltip text="对齐方式">
                <button
                  onMouseDown={(e) => { e.preventDefault(); toggleDropdown('align'); }}
                  className="flex items-center gap-1 p-2 text-sm hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors"
                >
                  {editor.isActive({ textAlign: 'center' }) ? <AlignCenter className="w-4 h-4" /> :
                    editor.isActive({ textAlign: 'right' }) ? <AlignRight className="w-4 h-4" /> :
                      editor.isActive({ textAlign: 'justify' }) ? <AlignJustify className="w-4 h-4" /> :
                        <AlignLeft className="w-4 h-4" />}
                  <ChevronDown className="w-3 h-3" />
                </button>
              </Tooltip>
              {activeDropdown === 'align' && (
                <div className="absolute top-full left-0 mt-1 bg-background border border-border shadow-lg rounded-lg py-1 flex px-1 gap-0.5 z-50">
                  <MenuButton onClick={() => { editor.chain().focus().setTextAlign('left').run(); closeDropdown(); }} isActive={editor.isActive({ textAlign: 'left' })} title="左对齐"><AlignLeft className="w-4 h-4" /></MenuButton>
                  <MenuButton onClick={() => { editor.chain().focus().setTextAlign('center').run(); closeDropdown(); }} isActive={editor.isActive({ textAlign: 'center' })} title="居中对齐"><AlignCenter className="w-4 h-4" /></MenuButton>
                  <MenuButton onClick={() => { editor.chain().focus().setTextAlign('right').run(); closeDropdown(); }} isActive={editor.isActive({ textAlign: 'right' })} title="右对齐"><AlignRight className="w-4 h-4" /></MenuButton>
                  <MenuButton onClick={() => { editor.chain().focus().setTextAlign('justify').run(); closeDropdown(); }} isActive={editor.isActive({ textAlign: 'justify' })} title="两端对齐"><AlignJustify className="w-4 h-4" /></MenuButton>
                </div>
              )}
            </div>

            <Divider />

            <MenuButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} title="加粗 (Ctrl+B)"><Bold className="w-4 h-4" /></MenuButton>
            <MenuButton onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive('strike')} title="删除线"><Strikethrough className="w-4 h-4" /></MenuButton>
            <MenuButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} title="斜体 (Ctrl+I)"><Italic className="w-4 h-4" /></MenuButton>
            <MenuButton onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive('underline')} title="下划线 (Ctrl+U)"><UnderlineIcon className="w-4 h-4" /></MenuButton>

            <Divider />

            {/* 插入链接 */}
            <div className="relative">
              <MenuButton
                onClick={() => {
                  const previousUrl = editor.getAttributes('link').href
                  setLinkUrl(previousUrl || '')
                  toggleDropdown('link')
                }}
                isActive={editor.isActive('link') || activeDropdown === 'link'}
                title="插入链接"
              >
                <LinkIcon className="w-4 h-4" />
              </MenuButton>
              {activeDropdown === 'link' && (
                <div
                  className="absolute top-full left-1/2 -translate-x-1/2 mt-1 p-2 bg-background border border-border shadow-xl rounded-lg flex items-center gap-2 z-50 min-w-[280px]"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="url"
                    placeholder="粘贴或输入链接"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); setLink() } }}
                    className="flex-1 px-3 py-1.5 text-sm border border-blue-400 focus:border-blue-500 rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-blue-500 text-foreground"
                    autoFocus
                  />
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); setLink() }}
                    className="px-4 py-1.5 bg-gray-200 dark:bg-gray-700 text-foreground text-sm rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium whitespace-nowrap"
                  >
                    确认
                  </button>
                </div>
              )}
            </div>

            <MenuButton onClick={() => editor.chain().focus().toggleCode().run()} isActive={editor.isActive('code')} title="行内代码"><Code className="w-4 h-4" /></MenuButton>

            <Divider />

            {/* 颜色面板 */}
            <div className="relative">
              <Tooltip text="文字与背景颜色">
                <button
                  onMouseDown={(e) => { e.preventDefault(); toggleDropdown('color'); }}
                  className={`p-2 flex items-center justify-center text-sm rounded-md transition-all duration-200 ${activeDropdown === 'color'
                    ? 'bg-gray-200 dark:bg-gray-700 shadow-sm'
                    : 'hover:bg-muted text-muted-foreground hover:text-foreground hover:shadow-sm'
                    }`}
                >
                  <div className="flex flex-col items-center justify-center relative pointer-events-none">
                    <div className="rounded-[2px]" style={{ backgroundColor: editor.getAttributes('highlight').color || 'transparent' }}>
                      <Baseline className="w-4 h-4" />
                    </div>
                    <div className="w-3 h-[3px] mt-[1px] rounded-full" style={{ backgroundColor: editor.getAttributes('textStyle').color || 'currentColor' }} />
                  </div>
                </button>
              </Tooltip>

              {activeDropdown === 'color' && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 p-3 bg-background border border-border shadow-xl rounded-lg w-[240px] z-50 cursor-default">
                  <div className="mb-4">
                    <div className="text-xs text-muted-foreground mb-2 font-medium">字体颜色</div>
                    <div className="flex gap-1.5">
                      {TEXT_COLORS.map(color => (
                        <button
                          key={color}
                          onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().setColor(color).run(); }}
                          className={`w-7 h-7 flex items-center justify-center border rounded-md text-sm font-bold hover:scale-110 transition-transform ${editor.isActive('textStyle', { color }) ? 'border-blue-500 ring-1 ring-blue-500 shadow-sm' : 'border-gray-200 dark:border-gray-700'}`}
                          style={{ color }}
                        >A</button>
                      ))}
                    </div>
                  </div>
                  <div className="mb-4">
                    <div className="text-xs text-muted-foreground mb-2 font-medium">背景颜色</div>
                    <div className="grid grid-cols-8 gap-1.5">
                      {BG_COLORS.map((color, i) => (
                        <button
                          key={i}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            if (color === 'transparent') { editor.chain().focus().unsetHighlight().run(); }
                            else { editor.chain().focus().setHighlight({ color }).run(); }
                          }}
                          className={`w-6 h-6 rounded-md border hover:scale-110 transition-transform ${editor.isActive('highlight', { color }) ? 'border-blue-500 ring-1 ring-blue-500 shadow-sm' : 'border-gray-200 dark:border-gray-700'}`}
                          style={{
                            background: color === 'transparent'
                              ? 'linear-gradient(to bottom right, transparent calc(50% - 1px), #d1d5db calc(50% - 1px), #d1d5db calc(50% + 1px), transparent calc(50% + 1px))'
                              : color
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  <button
                    onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().unsetColor().unsetHighlight().run(); closeDropdown(); }}
                    className="w-full py-1.5 text-xs text-foreground border border-border rounded-md hover:bg-muted transition-colors"
                  >恢复默认</button>
                </div>
              )}
            </div>

            <MenuButton onClick={() => editor.chain().focus().unsetAllMarks().run()} isActive={false} title="清除所有格式">
              <Eraser className="w-4 h-4" />
            </MenuButton>

            {/* 在 BubbleMenu 中增加一个 AI 专属下拉菜单 */}
            <div className="relative">
              <Tooltip text="AI 智能助手">
                <button
                  onMouseDown={(e) => { e.preventDefault(); toggleDropdown('ai'); }}
                  disabled={isAIGenerating}
                  className={`flex items-center gap-1 p-2 text-sm rounded-md transition-all ${isAIGenerating
                    ? 'text-purple-400 cursor-not-allowed'
                    : 'text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/30'
                    }`}
                >
                  {/* 如果正在生成，显示旋转的 Loading 图标 */}
                  {isAIGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <WandSparkles className="w-4 h-4" />}
                  <ChevronDown className="w-3 h-3 opacity-50" />
                </button>
              </Tooltip>

              {activeDropdown === 'ai' && (
                <div className="absolute top-full left-0 mt-1 bg-background border border-border shadow-lg rounded-lg py-1 flex flex-col w-36 z-50 overflow-hidden">
                  <button onMouseDown={(e) => { e.preventDefault(); handleAIAction('improve'); }} className="px-4 py-2 text-left text-sm hover:bg-muted text-foreground transition-colors flex items-center gap-2">
                    ✨ 智能润色
                  </button>
                  <button onMouseDown={(e) => { e.preventDefault(); handleAIAction('expand'); }} className="px-4 py-2 text-left text-sm hover:bg-muted text-foreground transition-colors flex items-center gap-2">
                    📝 扩写段落
                  </button>
                  <button onMouseDown={(e) => { e.preventDefault(); handleAIAction('academic'); }} className="px-4 py-2 text-left text-sm hover:bg-muted text-foreground transition-colors flex items-center gap-2">
                    🎓 更学术/专业
                  </button>
                  <button onMouseDown={(e) => { e.preventDefault(); handleAIAction('fix'); }} className="px-4 py-2 text-left text-sm hover:bg-muted text-foreground transition-colors flex items-center gap-2">
                    ✅ 修复语法
                  </button>
                </div>
              )}
            </div>
          </BubbleMenu>
        )}

        <EditorContent editor={editor} />
      </div>

      {/* 图片预览弹窗 */}
      {previewImage && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm transition-opacity"
          onClick={() => setPreviewImage(null)}
        >
          <button
            className="absolute top-6 right-6 p-2 text-white/70 hover:text-white bg-black/50 hover:bg-black/80 rounded-full transition-all"
            onClick={(e) => { e.stopPropagation(); setPreviewImage(null) }}
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={previewImage}
            alt="预览图片"
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-md shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  )
}
