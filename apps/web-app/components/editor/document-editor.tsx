"use client"

import { useState, useEffect } from "react"
import { updateDocument } from "@/api/document"
import { toast } from '@repo/ui'
import { Editor } from '@repo/editor'

// 定义传入数据的类型
interface DocumentEditorProps {
  initialDocument: {
    id: string
    title: string
    content: string | null
  }
}

export default function DocumentEditor({ initialDocument }: DocumentEditorProps) {
  const [title, setTitle] = useState(initialDocument.title)
  const [content, setContent] = useState(initialDocument.content || "")
  const [saveStatus, setSaveStatus] = useState("已保存")

  // 核心：防抖自动保存逻辑
  useEffect(() => {
    // 如果数据完全没变，不触发保存
    if (title === initialDocument.title && content === (initialDocument.content || "")) {
      return
    }

    setSaveStatus("正在保存...")

    const delayDebounceFn = setTimeout(() => {

      // 生成一小段纯文本摘要（取前 50 个字），用于首页卡片展示
      const excerpt = content.substring(0, 50).replace(/\n/g, ' ') + (content.length > 50 ? '...' : '')

      // 调用 Server Action 保存到数据库
      updateDocument(initialDocument.id, {
        title,
        content,
        excerpt
      }).then((res) => {
        if (res.success) setSaveStatus("已保存")
        else {
          setSaveStatus("保存失败")
          toast.error("云端保存失败，请检查网络连接")
        }
      })
    }, 1000) // 用户停止打字 1 秒后触发保存

    return () => clearTimeout(delayDebounceFn)
  }, [title, content, initialDocument.id, initialDocument.title, initialDocument.content])

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto w-full p-6 lg:p-10">
      {/* 顶栏：显示状态 */}
      <div className="flex items-center justify-between mb-8 text-sm text-muted-foreground font-mono">
        <span>ID: {initialDocument.id.split('-')[0]}</span>
        <span className="flex items-center gap-2">
          {saveStatus === "正在保存..." && (
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          )}
          {saveStatus}
        </span>
      </div>

      {/* 标题输入区 */}
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="无标题文稿"
        className="text-4xl font-bold border-none outline-none bg-transparent mb-6 text-foreground placeholder:text-muted-foreground/50 focus:ring-0"
      />

      {/* 正文输入区 */}
      <div className="flex-1 w-full min-h-[500px] cursor-text" onClick={() => document.querySelector('.ProseMirror')?.focus()}>
        <Editor
          content={content}
          onChange={setContent}
          placeholder="开始输入正文，或者输入 '/' 唤起 AI 指令..."
          className="prose prose-sm sm:prose-base dark:prose-invert focus:outline-none max-w-full min-h-[500px]"
        />
      </div>
    </div>
  )
}