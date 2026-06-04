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
import { toast } from '@repo/ui'
import { useEffect, useState } from 'react'
import {
  Bold,
  Italic,
  Strikethrough,
  Underline as UnderlineIcon,
  Link as LinkIcon,
  Code,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Type,
  Baseline,
  ChevronDown,
  Eraser
} from 'lucide-react'
import './editor.css'

// 接收一个 uploadFn 作为 prop，让业务层自己决定怎么上传
export interface EditorProps {
  content: string;
  onChange: (content: string) => void;
  uploadFn?: (file: File) => Promise<string | null>; // 新增上传回调
  className?: string;
  placeholder?: string;
}

// 自定义 Tooltip 组件
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

// 自定义的快捷键拦截扩展 保证回车之后清除了之前的样式标记
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

export function Editor({ content, onChange, uploadFn, className, placeholder }: EditorProps) {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const [linkUrl, setLinkUrl] = useState<string>('')

  const editor = useEditor({
    extensions: [
      ClearMarksOnEnter,
      StarterKit,
      Placeholder.configure({
        placeholder: placeholder || '写点什么...',
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-500 no-underline hover:underline cursor-pointer',
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Image.configure({
        HTMLAttributes: {
          class: 'rounded-lg max-w-full my-4 border border-border/50',// 允许图片响应式调整大小
        },
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class: className || 'prose prose-sm sm:prose-base dark:prose-invert focus:outline-none max-w-full min-h-[500px] px-4 py-4',
      },
      // 拦截粘贴事件
      handlePaste: (view, event) => {
        if (!uploadFn) return false // 如果没有传入 uploadFn，就走默认逻辑（可能是 base64 或者纯文本）

        const items = event.clipboardData?.items
        if (!items) return false

        // 遍历剪贴板内容
        for (const item of Array.from(items)) {
          // 如果发现是图片格式 (image/png, image/jpeg 等)
          if (item.type.indexOf('image') === 0) {
            const file = item.getAsFile()
            if (!file) continue

            // ⚠️ 阻止默认的粘贴行为
            event.preventDefault()

            toast.loading('正在上传图片...')

            // 异步上传
            uploadFn(file).then((url) => {
              if (url) {
                view.dispatch(
                  view.state.tr.replaceSelectionWith(
                    view.state.schema.nodes.image.create({ src: url })
                  )
                )
                toast.dismiss()
                toast.success('图片上传成功')
              } else {
                toast.dismiss()
                toast.error('上传失败，请重试')
              }
            })
            return true
          }
        }
        return false
      },
      handleDrop: (view, event, slice, moved) => {
        // 1. 防御性判断：如果没有上传函数，或者是内部文字拖拽排版 (moved = true)，直接放行
        if (!uploadFn || moved) return false

        // 2. 尝试提取拖入的文件
        const file = event.dataTransfer?.files?.[0]

        // 3. 校验是否为图片文件
        if (file && file.type.startsWith('image/')) {
          // ⚠️ 必须：阻止浏览器默认打开新标签页查看图片的行为
          event.preventDefault()

          // 开启 loading 提示 (传入 id 方便后续精准关闭)
          toast.loading('正在提取图片...', { id: 'upload-toast' })

          // 🌟 核心黑魔法：获取鼠标松开那一瞬间，在富文本树状结构中的确切坐标
          const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY })

          // 触发异步上传
          uploadFn(file).then((url) => {
            if (url) {
              // 创建一个图片节点
              const node = view.state.schema.nodes.image.create({ src: url })

              // 决定插入位置：如果有确切坐标就插在坐标处，否则插在当前光标位置
              const insertPos = coordinates?.pos || view.state.selection.to

              // 派发一个事务 (Transaction) 来安全地将节点插入到指定位置
              const transaction = view.state.tr.insert(insertPos, node)
              view.dispatch(transaction)

              toast.success('图片上传成功', { id: 'upload-toast' })
            } else {
              toast.error('图片云端上传失败，请重试', { id: 'upload-toast' })
            }
          })

          // 返回 true 告诉底层引擎：我已经完美接管了这个拖拽事件
          return true
        }

        // 如果拖进来的不是图片（比如拖了个 txt 进来），放行让默认逻辑处理
        return false
      }
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
  })

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content, { emitUpdate: false })
    }
  }, [content, editor])

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
  }

  return (
    <div className="tiptap-wrapper relative rounded-md bg-background overflow-hidden" onMouseLeave={closeDropdown}>
      {editor && (
        <BubbleMenu
          editor={editor}
          options={{ placement: 'top' }}
          className="flex items-center gap-0.5 bg-background border border-border shadow-xl rounded-xl overflow-visible p-1.5"
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
                <MenuButton onClick={() => { editor.chain().focus().setTextAlign('left').run(); closeDropdown(); }} isActive={editor.isActive({ textAlign: 'left' })} title="左对齐">
                  <AlignLeft className="w-4 h-4" />
                </MenuButton>
                <MenuButton onClick={() => { editor.chain().focus().setTextAlign('center').run(); closeDropdown(); }} isActive={editor.isActive({ textAlign: 'center' })} title="居中对齐">
                  <AlignCenter className="w-4 h-4" />
                </MenuButton>
                <MenuButton onClick={() => { editor.chain().focus().setTextAlign('right').run(); closeDropdown(); }} isActive={editor.isActive({ textAlign: 'right' })} title="右对齐">
                  <AlignRight className="w-4 h-4" />
                </MenuButton>
                <MenuButton onClick={() => { editor.chain().focus().setTextAlign('justify').run(); closeDropdown(); }} isActive={editor.isActive({ textAlign: 'justify' })} title="两端对齐">
                  <AlignJustify className="w-4 h-4" />
                </MenuButton>
              </div>
            )}
          </div>

          <Divider />

          {/* 其他按钮 */}
          <MenuButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} title="加粗 (Ctrl+B)">
            <Bold className="w-4 h-4" />
          </MenuButton>

          <MenuButton onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive('strike')} title="删除线">
            <Strikethrough className="w-4 h-4" />
          </MenuButton>

          <MenuButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} title="斜体 (Ctrl+I)">
            <Italic className="w-4 h-4" />
          </MenuButton>

          <MenuButton onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive('underline')} title="下划线 (Ctrl+U)">
            <UnderlineIcon className="w-4 h-4" />
          </MenuButton>

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
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      setLink()
                    }
                  }}
                  className="flex-1 px-3 py-1.5 text-sm border border-blue-400 focus:border-blue-500 rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-blue-500 text-foreground"
                  autoFocus
                />
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    setLink()
                  }}
                  className="px-4 py-1.5 bg-gray-200 dark:bg-gray-700 text-foreground text-sm rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium whitespace-nowrap"
                >
                  确认
                </button>
              </div>
            )}
          </div>

          <MenuButton onClick={() => editor.chain().focus().toggleCode().run()} isActive={editor.isActive('code')} title="行内代码">
            <Code className="w-4 h-4" />
          </MenuButton>

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
                  <div
                    className="rounded-[2px]"
                    style={{ backgroundColor: editor.getAttributes('highlight').color || 'transparent' }}
                  >
                    <Baseline className="w-4 h-4" />
                  </div>
                  <div
                    className="w-3 h-[3px] mt-[1px] rounded-full"
                    style={{ backgroundColor: editor.getAttributes('textStyle').color || 'currentColor' }}
                  />
                </div>
              </button>
            </Tooltip>

            {activeDropdown === 'color' && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 p-3 bg-background border border-border shadow-xl rounded-lg w-[240px] z-50 cursor-default">
                {/* 字体颜色选择 */}
                <div className="mb-4">
                  <div className="text-xs text-muted-foreground mb-2 font-medium">字体颜色</div>
                  <div className="flex gap-1.5">
                    {TEXT_COLORS.map(color => (
                      <button
                        key={color}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          editor.chain().focus().setColor(color).run();
                        }}
                        className={`w-7 h-7 flex items-center justify-center border rounded-md text-sm font-bold hover:scale-110 transition-transform ${editor.isActive('textStyle', { color })
                          ? 'border-blue-500 ring-1 ring-blue-500 shadow-sm'
                          : 'border-gray-200 dark:border-gray-700'
                          }`}
                        style={{ color }}
                      >
                        A
                      </button>
                    ))}
                  </div>
                </div>

                {/* 背景颜色选择 */}
                <div className="mb-4">
                  <div className="text-xs text-muted-foreground mb-2 font-medium">背景颜色</div>
                  <div className="grid grid-cols-8 gap-1.5">
                    {BG_COLORS.map((color, i) => (
                      <button
                        key={i}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          if (color === 'transparent') {
                            editor.chain().focus().unsetHighlight().run();
                          } else {
                            editor.chain().focus().setHighlight({ color }).run();
                          }
                        }}
                        className={`w-6 h-6 rounded-md border hover:scale-110 transition-transform ${editor.isActive('highlight', { color })
                          ? 'border-blue-500 ring-1 ring-blue-500 shadow-sm'
                          : 'border-gray-200 dark:border-gray-700'
                          }`}
                        style={{
                          background: color === 'transparent'
                            ? 'linear-gradient(to bottom right, transparent calc(50% - 1px), #d1d5db calc(50% - 1px), #d1d5db calc(50% + 1px), transparent calc(50% + 1px))'
                            : color
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* 恢复默认 */}
                <button
                  onMouseDown={(e) => {
                    e.preventDefault();
                    editor.chain().focus().unsetColor().unsetHighlight().run();
                    closeDropdown();
                  }}
                  className="w-full py-1.5 text-xs text-foreground border border-border rounded-md hover:bg-muted transition-colors"
                >
                  恢复默认
                </button>
              </div>
            )}
          </div>

          <MenuButton onClick={() => editor.chain().focus().unsetAllMarks().run()} isActive={false} title="清除所有格式">
            <Eraser className="w-4 h-4" />
          </MenuButton>
        </BubbleMenu>
      )}

      <EditorContent editor={editor} />
    </div>
  )
}