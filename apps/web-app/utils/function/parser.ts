/**
 * 将 Markdown 格式的文本字符串解析转换为 HTML 结构
 * 
 * @param markdown Markdown 格式字符串
 * @returns 语义化的 HTML 字符串
 */
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

/**
 * 内联 Markdown 元素解析（粗体、斜体、行内代码、链接）
 */
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

/**
 * 将纯文本 TXT 转换包装为 HTML 段落
 */
export function convertTxtToHtml(txt: string): string {
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

/**
 * 从 Markdown 中提取纯文本以生成列表摘要
 */
export function extractPlainTextFromMarkdown(markdown: string): string {
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

/**
 * 从 HTML 字符串中剥离全部 HTML 标签，返回纯文本
 */
export function extractPlainTextFromHtml(html: string): string {
  let text = html.replace(/<[^>]*>/g, " ")
  // 转义常见 HTML 实体
  text = text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
  return text.replace(/\s+/g, " ").trim()
}
