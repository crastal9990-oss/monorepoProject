"use client"

import { useState, useEffect, useRef } from "react"
import { uploadImage } from "@/api/document"
import { updateDocument } from '@/api/search'
import { toast } from '@repo/ui'
import { Editor } from '@repo/editor'
import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'

// 定义传入数据的类型
interface DocumentEditorProps {
  initialDocument: {
    id: string
    title: string
    content: string | null
  }
}

export default function DocumentEditor({ initialDocument }: DocumentEditorProps) {
  const router = useRouter()
  const [title, setTitle] = useState(initialDocument.title)
  const [content, setContent] = useState(initialDocument.content || "")
  const [saveStatus, setSaveStatus] = useState("已保存")

  // ✨ 新增：使用 useRef 管理定时器和状态，跨渲染周期保持稳定
  const textSaveTimer = useRef<NodeJS.Timeout | null>(null)
  const vectorSaveTimer = useRef<NodeJS.Timeout | null>(null)
  const hasPendingVectorSave = useRef(false) // 记录是否有未生成的向量

  // 辅助函数：提取摘要（复用你原来的优秀逻辑）
  const generateExcerpt = (htmlContent: string) => {
    const plainText = htmlContent.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ')
    return plainText.substring(0, 50).replace(/\n/g, ' ') + (plainText.length > 50 ? '...' : '')
  }

  // 双重防抖自动保存逻辑
  useEffect(() => {
    // 如果数据完全没变，不触发保存
    if (title === initialDocument.title && content === (initialDocument.content || "")) {
      return
    }

    setSaveStatus("正在保存...")
    hasPendingVectorSave.current = true // 标记当前有未做向量化的改动

    // 清除之前的定时器（用户还在疯狂打字，重新计时）
    if (textSaveTimer.current) clearTimeout(textSaveTimer.current)
    if (vectorSaveTimer.current) clearTimeout(vectorSaveTimer.current)

    const excerpt = generateExcerpt(content)

    // ⏱️ 计时器 1：常规文本保存（停顿 1.5 秒触发，不花钱，保证数据不丢）
    textSaveTimer.current = setTimeout(() => {
      // 注意这里的第三个参数是 false
      updateDocument(initialDocument.id, { title, content, excerpt }, false).then((res) => {
        if (res.success) setSaveStatus("已保存")
        else {
          setSaveStatus("保存失败")
          toast.error("云端保存失败，请检查网络连接")
        }
      })
    }, 1500)

    // ⏱️ 计时器 2：深度向量保存（停顿 15 秒完全没敲击键盘才触发）
    vectorSaveTimer.current = setTimeout(() => {
      //setSaveStatus("正在生成 AI 搜索索引...")
      updateDocument(initialDocument.id, { title, content, excerpt }, true).then((res) => {
        if (res.success) {
          setSaveStatus("已保存")
          hasPendingVectorSave.current = false // 向量更新完毕，清除标记
        } else {
          setSaveStatus("索引生成失败")
          toast.error("AI 索引生成失败：" + (res.error || "未知错误"))
        }
      })
    }, 15000)

    // 清理函数：组件卸载或下次 effect 执行前清理
    return () => {
      if (textSaveTimer.current) clearTimeout(textSaveTimer.current)
      if (vectorSaveTimer.current) clearTimeout(vectorSaveTimer.current)
    }
  }, [title, content, initialDocument.id, initialDocument.title, initialDocument.content])

  // ✨ 新增：处理安全退出（拦截返回按钮）
  const handleBack = async () => {
    if (hasPendingVectorSave.current) {
      const excerpt = generateExcerpt(content)
      // 强制触发一次向量更新
      await updateDocument(initialDocument.id, { title, content, excerpt }, true)
      hasPendingVectorSave.current = false
    }
    router.back()
  }

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto w-full p-6 lg:p-10">

      {/* 返回按钮：改用 handleBack */}
      <button
        onClick={handleBack}
        className="flex items-center text-muted-foreground hover:text-foreground transition-colors mb-6 text-sm w-fit"
      >
        <ChevronLeft className="w-4 h-4 mr-1" />
        返回
      </button>

      {/* 标题输入区 */}
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="请输入标题"
        className="text-4xl font-bold border-none outline-none bg-transparent mb-6 text-foreground placeholder:text-muted-foreground/50 focus:ring-0"
      />

      {/* 用户id和保存状态 */}
      <div className="flex items-center justify-between mb-8 text-sm text-muted-foreground font-mono">
        <span>ID: {initialDocument.id.split('-')[0]}</span>
        <span className="flex items-center gap-2">
          {saveStatus.includes("正在") && (
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          )}
          {saveStatus}
        </span>
      </div>

      {/* 正文输入区 */}
      <div className="flex-1 w-full min-h-[500px] cursor-text" onClick={() => document.querySelector<HTMLElement>('.ProseMirror')?.focus()}>
        <Editor
          content={content}
          onChange={setContent}
          uploadFn={async (file) => {
            const formData = new FormData()
            formData.append('file', file)
            return await uploadImage(formData)
          }}
          placeholder="开始输入正文，或者输入 '/' 唤起 AI 指令..."
          className="prose prose-sm sm:prose-base dark:prose-invert focus:outline-none max-w-full min-h-[500px]"
        />
      </div>
    </div>
  )
}