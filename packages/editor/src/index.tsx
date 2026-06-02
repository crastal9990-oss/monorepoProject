"use client"

// 1. 引入 BubbleMenu
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { useEffect } from 'react'
import './editor.css'

export interface EditorProps {
  content: string;
  onChange: (content: string) => void;
  className?: string;
  placeholder?: string;
}

export function Editor({ content, onChange, className, placeholder }: EditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: placeholder || '写点什么...',
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class: className || 'prose prose-sm sm:prose-base dark:prose-invert focus:outline-none max-w-full min-h-[500px]',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
  })

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content, false)
    }
  }, [content, editor])

  return (
    <div className="tiptap-wrapper relative">
      {/* 2. 添加悬浮气泡菜单 */}
      {editor && (
        <BubbleMenu
          editor={editor}
          tippyOptions={{ duration: 100 }}
          className="flex items-center bg-background border border-border shadow-md rounded-md overflow-hidden p-1 gap-1"
        >
          {/* 加粗按钮 */}
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`px-2 py-1 text-sm rounded-sm transition-colors ${editor.isActive('bold')
                ? 'bg-primary text-primary-foreground' // 选中时的状态
                : 'hover:bg-muted text-foreground'     // 未选中时的状态
              }`}
          >
            加粗
          </button>

          {/* 斜体按钮 */}
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`px-2 py-1 text-sm rounded-sm transition-colors ${editor.isActive('italic')
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted text-foreground'
              }`}
          >
            斜体
          </button>

          {/* 删除线按钮 */}
          <button
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={`px-2 py-1 text-sm rounded-sm transition-colors ${editor.isActive('strike')
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted text-foreground'
              }`}
          >
            删除线
          </button>
        </BubbleMenu>
      )}

      {/* 原有的编辑器内容 */}
      <EditorContent editor={editor} />
    </div>
  )
}