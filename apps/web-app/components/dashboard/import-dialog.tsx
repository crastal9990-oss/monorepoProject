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
import { loadMammoth, convertDocxToHtmlWithImages } from "@/utils/function/mammoth"
import {
  convertMarkdownToHtml,
  convertTxtToHtml,
  extractPlainTextFromMarkdown,
  extractPlainTextFromHtml
} from "@/utils/function/parser"

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
  const [importMode, setImportMode] = useState<"preview" | "convert">("preview")
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
      setImportMode("preview")
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
    const isDocx = file.name.endsWith(".docx")
    const isPdf = file.name.endsWith(".pdf")

    if (!isMd && !isTxt && !isDocx && !isPdf) {
      toast.error("仅支持导入 .md, .markdown, .txt, .docx 或 .pdf 格式的文件")
      return
    }

    setSelectedFile(file)

    // 设置默认标题（移除文件后缀）
    const baseName = file.name.replace(/\.(md|markdown|txt|docx|pdf)$/i, "")
    setFileTitle(baseName)

    if (isDocx) {
      setIsPending(true)
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer
          const mammothInstance = await loadMammoth()
          const result = await mammothInstance.convertToHtml({ arrayBuffer })
          setFileContent(result.value)
        } catch (err) {
          console.error("解析 docx 文件失败", err)
          toast.error("解析 Word 文档失败，请检查文件格式或重试")
          setSelectedFile(null)
          setFileContent("")
          setFileTitle("")
        } finally {
          setIsPending(false)
        }
      }
      reader.readAsArrayBuffer(file)
    } else if (isPdf) {
      setFileContent("")
    } else {
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

    const isPdf = isFile && selectedFile?.name.endsWith(".pdf")

    if (!isPdf && !content.trim()) {
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

      // 1. 将 Markdown/TXT/DOCX 内容转换为 HTML
      const isDocx = isFile && selectedFile?.name.endsWith(".docx")
      const isWordPreview = isDocx && importMode === "preview"
      const isMarkdown = isFile ? (selectedFile?.name.endsWith(".md") || selectedFile?.name.endsWith(".markdown")) : true // 剪贴板内容默认视作 Markdown/富文本

      let htmlContent = ""
      let plainText = ""

      if (isDocx && selectedFile) {
        if (isWordPreview) {
          htmlContent = content
          plainText = extractPlainTextFromHtml(content)
        } else {
          // 直接转换模式：读取二进制流，调用公共转换解析工具上传图片并返回 HTML
          const fileReader = new FileReader()
          const docxPromise = new Promise<string>((resolve, reject) => {
            fileReader.onload = async (e) => {
              try {
                const arrBuf = e.target?.result as ArrayBuffer
                const html = await convertDocxToHtmlWithImages(arrBuf)
                resolve(html)
              } catch (err) {
                reject(err)
              }
            }
            fileReader.onerror = () => reject(new Error("读取文件失败"))
            fileReader.readAsArrayBuffer(selectedFile)
          })

          htmlContent = await docxPromise
          plainText = extractPlainTextFromHtml(htmlContent)
        }
      } else if (!isPdf) {
        htmlContent = isMarkdown ? convertMarkdownToHtml(content) : convertTxtToHtml(content)
        plainText = extractPlainTextFromMarkdown(content)
      }

      // 2. 向数据库插入新文稿元数据
      const finalTitle = title || (isFile ? "未命名导入文件" : "未命名剪贴板导入")
      const finalExcerpt = isPdf ? `PDF 文档 - ${finalTitle}` : plainText.slice(0, 120).trim()

      const { data, error } = await supabase
        .from("documents")
        .insert([
          {
            user_id: user.id,
            title: finalTitle,
            excerpt: finalExcerpt || "开始你的记录...",
            is_word_raw: isWordPreview,
            word_file_url: null,
            is_pdf_raw: isPdf,
            pdf_file_url: null
          }
        ])
        .select()
        .single()

      if (error || !data) throw error

      if (isPdf && selectedFile) {
        // 上传原始 pdf 到 Storage 桶 notes-images
        const filePath = `pdf_files/${user.id}/${data.id}.pdf`
        const { error: uploadError } = await supabase.storage
          .from("notes-images")
          .upload(filePath, selectedFile, {
            cacheControl: "3600",
            upsert: true
          })
        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from("notes-images")
          .getPublicUrl(filePath)

        const { error: updateError } = await supabase
          .from("documents")
          .update({ pdf_file_url: publicUrl })
          .eq("id", data.id)

        if (updateError) throw updateError

        data.pdf_file_url = publicUrl
      } else if (isWordPreview && selectedFile) {
        // 上传原始 docx 到 Storage 桶 notes-images
        const filePath = `word_files/${user.id}/${data.id}.docx`
        const { error: uploadError } = await supabase.storage
          .from("notes-images")
          .upload(filePath, selectedFile, {
            cacheControl: "3600",
            upsert: true
          })
        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from("notes-images")
          .getPublicUrl(filePath)

        const { error: updateError } = await supabase
          .from("documents")
          .update({ word_file_url: publicUrl })
          .eq("id", data.id)

        if (updateError) throw updateError

        data.word_file_url = publicUrl
      } else {
        // 如果是直接转换（或者是 MD/TXT），将 HTML 内容暂存至 sessionStorage 中
        sessionStorage.setItem(`import_content_${data.id}`, htmlContent)
      }

      // 3. 广播文档创建事件，同步更新左侧侧边栏
      window.dispatchEvent(new CustomEvent('document-created', { detail: data }))

      // toast.success("导入成功，正在进入编辑器...")

      // 5. 先跳转至编辑器页面
      router.push(`/notes/${data.id}`)

      // 6. 关闭对话框
      onOpenChange(false)
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

          <div className="h-[300px] w-full">
            {/* ====== 本地文件导入 Tab ====== */}
            <TabsContent value="file" className="h-full mt-0 focus-visible:outline-none">
              {!selectedFile ? (
                // 拖拽上传状态
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex flex-col items-center justify-center h-full border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 group ${dragActive
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40 hover:bg-muted/30"
                    }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".md,.markdown,.txt,.docx,.pdf"
                    className="hidden"
                  />
                  <div className="p-4 bg-muted rounded-full text-muted-foreground mb-4 group-hover:text-primary transition-colors">
                    <Upload className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-medium text-foreground mb-2">
                    拖拽文件到此处，或 点击上传
                  </p>
                  <p className="text-xs text-muted-foreground">
                    仅支持 .md、.txt、.docx、.pdf 格式
                  </p>
                </div>
              ) : (
                // 文件已选择状态
                <div className="flex flex-col h-full justify-start gap-5 pt-1">

                  {/* 1. 文件信息卡片 */}
                  <div className="flex items-center justify-between border border-border bg-muted/20 rounded-xl p-3.5 shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 bg-background border border-border/50 rounded-lg shadow-sm text-primary">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground truncate max-w-[280px]">
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

                  {/* 2. 文档标题输入框 */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">文档标题</label>
                    <Input
                      type="text"
                      placeholder="请输入文档标题"
                      value={fileTitle}
                      onChange={(e) => setFileTitle(e.target.value)}
                      className="h-10 border-border/80 shadow-sm"
                    />
                  </div>

                  {/* 3. Word 导入选项 (仅当选中 .docx 时渲染) */}
                  {selectedFile.name.endsWith(".docx") && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">导入选项</label>
                      <div className="grid grid-cols-2 gap-4 mt-1">

                        <div
                          onClick={() => setImportMode('preview')}
                          className={`relative flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${importMode === 'preview'
                            ? 'border-foreground bg-foreground/[0.02] shadow-sm'
                            : 'border-muted hover:border-foreground/30 hover:bg-muted/30'
                            }`}
                        >
                          <div className={`absolute top-4 right-4 flex items-center justify-center w-4 h-4 rounded-full border ${importMode === 'preview' ? 'border-foreground' : 'border-muted-foreground/40'}`}>
                            {importMode === 'preview' && <div className="w-2 h-2 rounded-full bg-foreground" />}
                          </div>
                          <span className="text-[13px] font-semibold text-foreground mb-1">原始格式预览</span>
                          <span className="text-[11px] text-muted-foreground leading-relaxed pr-6">Office 预览，只读</span>
                        </div>

                        <div
                          onClick={() => setImportMode('convert')}
                          className={`relative flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${importMode === 'convert'
                            ? 'border-foreground bg-foreground/[0.02] shadow-sm'
                            : 'border-muted hover:border-foreground/30 hover:bg-muted/30'
                            }`}
                        >
                          <div className={`absolute top-4 right-4 flex items-center justify-center w-4 h-4 rounded-full border ${importMode === 'convert' ? 'border-foreground' : 'border-muted-foreground/40'}`}>
                            {importMode === 'convert' && <div className="w-2 h-2 rounded-full bg-foreground" />}
                          </div>
                          <span className="text-[13px] font-semibold text-foreground mb-1">转为在线文档</span>
                          <span className="text-[11px] text-muted-foreground leading-relaxed pr-6">解析正文并协同编辑</span>
                        </div>

                      </div>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            {/* ====== 剪贴板生成 Tab ====== */}
            <TabsContent value="clipboard" className="flex flex-col h-full mt-0 gap-4 focus-visible:outline-none">
              <div className="flex gap-3 pt-1">
                <Input
                  type="text"
                  placeholder="请输入文档标题（选填）"
                  value={clipboardTitle}
                  onChange={(e) => setClipboardTitle(e.target.value)}
                  className="h-10 flex-1 border-border/80 shadow-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleReadClipboard}
                  className="h-10 px-4 gap-2 font-medium bg-background"
                >
                  <Clipboard className="h-4 w-4 text-muted-foreground" />
                  读取剪贴板
                </Button>
              </div>

              <div className="flex-1 flex flex-col space-y-2 min-h-0">
                <label className="text-sm font-medium text-foreground">粘贴文本内容</label>
                <textarea
                  placeholder="在此粘贴或输入 Markdown / 纯文本内容..."
                  value={clipboardText}
                  onChange={(e) => setClipboardText(e.target.value)}
                  // resize-none 确保拉伸不会破坏弹窗
                  className="flex-1 w-full rounded-xl border border-input bg-transparent px-4 py-3 text-[13px] shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none leading-relaxed"
                />
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <AlertDialogFooter className="pt-5 pb-1 flex flex-row items-center justify-end gap-3 space-y-0">
          <AlertDialogCancel asChild>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => onOpenChange(false)}
              className="h-10 px-6 font-medium border-border/80 hover:bg-muted/50"
            >
              取消
            </Button>
          </AlertDialogCancel>
          <Button
            type="button"
            disabled={isPending || (activeTab === "file" ? !selectedFile : !clipboardText.trim())}
            onClick={handleImport}
            className="h-10 px-6 font-medium bg-foreground text-background hover:bg-foreground/90 gap-2 shadow-md"
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


