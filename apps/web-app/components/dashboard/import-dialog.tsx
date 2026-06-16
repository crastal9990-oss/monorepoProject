"use client"

import * as React from "react"
import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Upload, FileText, Clipboard, Loader2, X, AlertCircle } from "lucide-react"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  Button,
  Input,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  toast
} from "@repo/ui"
import { createClient } from "@/utils/supabase/client"

interface ImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ImportDialog({ open, onOpenChange }: ImportDialogProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<string>("file")
  const [isPending, setIsPending] = useState<boolean>(false)

  // 文件状态
  const [dragActive, setDragActive] = useState<boolean>(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileContent, setFileContent] = useState<string>("")
  const [fileTitle, setFileTitle] = useState<string>("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 剪贴板状态
  const [clipboardText, setClipboardText] = useState<string>("")
  const [clipboardTitle, setClipboardTitle] = useState<string>("")

  // 当弹窗打开或关闭时清理状态
  useEffect(() => {
    if (!open) {
      setSelectedFile(null)
      setFileContent("")
      setFileTitle("")
      setClipboardText("")
      setClipboardTitle("")
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }, [open])

  // 拖拽文件相关处理
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      validateAndReadFile(file)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      validateAndReadFile(file)
    }
  }

  const validateAndReadFile = (file: File) => {
    const isMd = file.name.endsWith(".md") || file.name.endsWith(".markdown")
    const isTxt = file.name.endsWith(".txt")

    if (!isMd && !isTxt) {
      toast.error("仅支持导入 .md, .markdown 或 .txt 格式的文件")
      return
    }

    setSelectedFile(file)

    // 设置默认标题（移除文件后缀）
    const baseName = file.name.replace(/\.(md|markdown|txt)$/i, "")
    setFileTitle(baseName)

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      setFileContent(text)

      // 如果是 Markdown 且包含一级标题，提取其内容作为文档标题
      if (isMd) {
        const firstHeadingMatch = text.match(/^#\s+(.+)$/m)
        if (firstHeadingMatch && firstHeadingMatch[1]) {
          setFileTitle(firstHeadingMatch[1].trim())
        }
      }
    }
    reader.readAsText(file)
  }

  // 剪贴板处理
  const handleReadClipboard = async () => {
    try {
      if (!navigator.clipboard || !navigator.clipboard.readText) {
        toast.error("您的浏览器安全策略不允许读取剪贴板，请手动粘贴")
        return
      }
      const text = await navigator.clipboard.readText()
      if (!text.trim()) {
        toast.warning("剪贴板内容为空")
        return
      }
      setClipboardText(text)

      // 生成默认文档标题
      const dateStr = new Date().toLocaleDateString("zh-CN", {
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      })
      setClipboardTitle(`剪贴板导入 - ${dateStr}`)
      toast.success("成功读取剪贴板内容")
    } catch (err) {
      toast.error("未能读取剪贴板，请手动粘贴")
    }
  }

  const handleImport = async () => {
    const isFile = activeTab === "file"
    const content = isFile ? fileContent : clipboardText
    const title = isFile ? fileTitle.trim() : clipboardTitle.trim()

    if (!content.trim()) {
      toast.error("导入的文本内容不能为空")
      return
    }

    setIsPending(true)

    try {
      const supabase = createClient()
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (!user || authError) {
        toast.error("未登录或登录状态已过期，请重新登录")
        return
      }

      // 1. 将 Markdown/TXT 内容转换为 HTML
      const isMarkdown = isFile ? (selectedFile?.name.endsWith(".md") || selectedFile?.name.endsWith(".markdown")) : true // 剪贴板内容默认视作 Markdown/富文本
      const htmlContent = isMarkdown ? convertMarkdownToHtml(content) : convertTxtToHtml(content)
      const plainText = extractPlainTextFromMarkdown(content)

      // 2. 向数据库插入新文稿元数据（正文将由协作编辑器通过 sessionStorage 在挂载时同步写入）
      const finalTitle = title || (isFile ? "未命名导入文件" : "未命名剪贴板导入")
      const finalExcerpt = plainText.slice(0, 120).trim()

      const { data, error } = await supabase
        .from("documents")
        .insert([
          {
            user_id: user.id,
            title: finalTitle,
            excerpt: finalExcerpt || "开始你的记录..."
          }
        ])
        .select()
        .single()

      if (error || !data) throw error

      // 3. 广播文档创建事件，同步更新左侧侧边栏
      window.dispatchEvent(new CustomEvent('document-created', { detail: data }))

      // 4. 将 HTML 内容暂存至 sessionStorage 中
      sessionStorage.setItem(`import_content_${data.id}`, htmlContent)

      toast.success("导入成功，正在进入编辑器...")
      onOpenChange(false)

      // 5. 跳转至编辑器页面
      router.push(`/notes/${data.id}`)
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || "导入失败，请稍后重试")
      setIsPending(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-[550px] p-6 gap-0 rounded-2xl border bg-background shadow-xl">
        <AlertDialogHeader className="relative flex flex-row items-center justify-between pb-6 space-y-0">
          <AlertDialogTitle className="text-xl font-bold text-foreground">
            导入外部数据
          </AlertDialogTitle>
          <button
            onClick={() => onOpenChange(false)}
            className="absolute right-0 top-0 p-1 rounded-md text-muted-foreground hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </AlertDialogHeader>

        <Tabs defaultValue="file" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 p-1 bg-muted/60 rounded-lg mb-6">
            <TabsTrigger value="file" className="rounded-md py-2 text-sm font-medium gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Upload className="h-4 w-4" />
              本地文件导入
            </TabsTrigger>
            <TabsTrigger value="clipboard" className="rounded-md py-2 text-sm font-medium gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Clipboard className="h-4 w-4" />
              系统剪贴板生成
            </TabsTrigger>
          </TabsList>

          <div className="h-[260px] w-full">
            <TabsContent value="file" className="h-full mt-0 focus-visible:outline-none">
              {!selectedFile ? (
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex flex-col items-center justify-center h-full border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 group ${dragActive
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground/50 hover:bg-muted/30"
                    }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".md,.markdown,.txt"
                    className="hidden"
                  />
                  <div className="p-3 bg-muted rounded-full text-muted-foreground mb-4 group-hover:text-foreground transition-colors">
                    <Upload className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-medium text-foreground mb-2">
                    拖拽文件到此处，或 点击上传
                  </p>
                  <p className="text-xs text-muted-foreground">
                    仅支持 .md、.markdown、.txt、.docx、.pdf 格式
                  </p>
                </div>
              ) : (
                <div className="flex flex-col h-full justify-center gap-6">
                  <div className="flex items-center justify-between border border-border bg-muted/30 rounded-xl p-4">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-background rounded-lg shadow-sm text-primary">
                        <FileText className="h-6 w-6" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground truncate max-w-[250px]">
                          {selectedFile.name}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {(selectedFile.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedFile(null)
                        setFileContent("")
                        setFileTitle("")
                        if (fileInputRef.current) fileInputRef.current.value = ""
                      }}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      清除
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">文档标题</label>
                    <Input
                      type="text"
                      placeholder="请输入文档标题"
                      value={fileTitle}
                      onChange={(e) => setFileTitle(e.target.value)}
                      className="h-10"
                    />
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="clipboard" className="flex flex-col h-full mt-0 gap-4 focus-visible:outline-none">
              <div className="flex gap-3">
                <Input
                  type="text"
                  placeholder="请输入文档标题（选填）"
                  value={clipboardTitle}
                  onChange={(e) => setClipboardTitle(e.target.value)}
                  className="h-10 flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleReadClipboard}
                  className="h-10 px-4 gap-2 font-medium"
                >
                  <Clipboard className="h-4 w-4" />
                  读取剪贴板
                </Button>
              </div>

              <div className="flex-1 flex flex-col space-y-2 min-h-0">
                <label className="text-sm font-medium text-muted-foreground">粘贴文本内容</label>
                <textarea
                  placeholder="在此粘贴或输入 Markdown / 纯文本内容..."
                  value={clipboardText}
                  onChange={(e) => setClipboardText(e.target.value)}
                  className="flex-1 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                />
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <AlertDialogFooter className="pt-6 flex flex-row items-center justify-end gap-3 space-y-0">
          <AlertDialogCancel asChild>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => onOpenChange(false)}
              className="h-10 px-6 font-medium border-border"
            >
              取消
            </Button>
          </AlertDialogCancel>
          <Button
            type="button"
            disabled={isPending || (activeTab === "file" ? !selectedFile : !clipboardText.trim())}
            onClick={handleImport}
            className="h-10 px-6 font-medium bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                导入中...
              </>
            ) : (
              "开始导入"
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// ─── Markdown/TXT 转 HTML 解析算法 ──────────────────────────────────────────

export function convertMarkdownToHtml(markdown: string): string {
  const lines = markdown.split(/\r?\n/)
  let html = ""
  let inList = false
  let listType: "ul" | "ol" | null = null
  let inCodeBlock = false
  let codeBlockContent = ""

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // 解析代码块
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        inCodeBlock = false
        const escaped = codeBlockContent
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
        html += `<pre><code>${escaped}</code></pre>\n`
        codeBlockContent = ""
      } else {
        inCodeBlock = true
      }
      continue
    }

    if (inCodeBlock) {
      codeBlockContent += (codeBlockContent ? "\n" : "") + line
      continue
    }

    // 解析标题
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/)
    if (headingMatch) {
      if (inList) {
        html += listType === "ul" ? "</ul>\n" : "</ol>\n"
        inList = false
        listType = null
      }
      const level = headingMatch[1].length
      const text = parseInlineMarkdown(headingMatch[2])
      html += `<h${level}>${text}</h${level}>\n`
      continue
    }

    // 解析区块引用
    const blockquoteMatch = line.match(/^>\s*(.*)$/)
    if (blockquoteMatch) {
      if (inList) {
        html += listType === "ul" ? "</ul>\n" : "</ol>\n"
        inList = false
        listType = null
      }
      const text = parseInlineMarkdown(blockquoteMatch[1])
      html += `<blockquote>${text}</blockquote>\n`
      continue
    }

    // 解析无序列表
    const ulMatch = line.match(/^\s*[-*+]\s+(.*)$/)
    if (ulMatch) {
      if (!inList || listType !== "ul") {
        if (inList) {
          html += listType === "ul" ? "</ul>\n" : "</ol>\n"
        }
        html += "<ul>\n"
        inList = true
        listType = "ul"
      }
      const text = parseInlineMarkdown(ulMatch[1])
      html += `<li>${text}</li>\n`
      continue
    }

    // 解析有序列表
    const olMatch = line.match(/^\s*(\d+)\.\s+(.*)$/)
    if (olMatch) {
      if (!inList || listType !== "ol") {
        if (inList) {
          html += listType === "ul" ? "</ul>\n" : "</ol>\n"
        }
        html += "<ol>\n"
        inList = true
        listType = "ol"
      }
      const text = parseInlineMarkdown(olMatch[2])
      html += `<li>${text}</li>\n`
      continue
    }

    // 空行处理
    if (line.trim() === "") {
      if (inList) {
        html += listType === "ul" ? "</ul>\n" : "</ol>\n"
        inList = false
        listType = null
      }
      continue
    }

    // 普通段落
    if (inList) {
      html += listType === "ul" ? "</ul>\n" : "</ol>\n"
      inList = false
      listType = null
    }
    const text = parseInlineMarkdown(line)
    html += `<p>${text}</p>\n`
  }

  if (inList) {
    html += listType === "ul" ? "</ul>\n" : "</ol>\n"
  }

  return html
}

function parseInlineMarkdown(text: string): string {
  return text
    // 转义 HTML 字符
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    // 粗体
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    // 斜体
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    // 行内代码
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    // 超链接
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
}

function convertTxtToHtml(txt: string): string {
  return txt
    .split(/\r?\n/)
    .map(line => {
      const trimmed = line.trim()
      if (!trimmed) return ""
      const escaped = trimmed
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
      return `<p>${escaped}</p>`
    })
    .filter(Boolean)
    .join("\n")
}

function extractPlainTextFromMarkdown(markdown: string): string {
  // 从 Markdown 中提取纯文本以生成列表摘要
  let text = markdown
    // 移除标题标记
    .replace(/^#{1,6}\s+/gm, "")
    // 移除引用标记
    .replace(/^>\s+/gm, "")
    // 移除代码块
    .replace(/```[\s\S]*?```/g, "")
    // 移除行内代码
    .replace(/`([^`]+)`/g, "$1")
    // 移除加粗/斜体
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    // 移除超链接（仅保留文本）
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    // 移除列表标记
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")

  // 移除多余换行并格式化空格
  return text.replace(/\s+/g, " ").trim()
}
