import React, { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface TocItem {
  id: string
  level: number
  text: string
  pos: number
}

export const TableOfContents = ({ editor }: { editor: any }) => {
  const [items, setItems] = useState<TocItem[]>([])
  const [isCollapsed, setIsCollapsed] = useState(false)

  useEffect(() => {
    if (!editor) return

    // 提取目录的函数
    const updateToc = () => {
      const toc: TocItem[] = []

      editor.state.doc.descendants((node: any, pos: number) => {
        if (node.type.name === 'heading') {
          const text = node.textContent.trim()
          if (text) {
            toc.push({
              id: `heading-${pos}`,
              level: node.attrs.level,
              text: text,
              pos: pos,
            })
          }
        }
      })
      setItems(toc)
    }

    // 初始化提取一次
    updateToc()

    // 监听编辑器内容更新，实时刷新目录
    editor.on('update', updateToc)

    return () => {
      editor.off('update', updateToc)
    }
  }, [editor])

  // 点击目录跳转到对应位置
  const handleItemClick = (e: React.MouseEvent, pos: number) => {
    e.preventDefault()
    if (!editor) return

    // 设置光标位置并滚动到视图中央
    editor.chain().focus().setTextSelection(pos).run()

    // 获取对应的 DOM 节点并平滑滚动
    const domNode = editor.view.nodeDOM(pos) as HTMLElement | null
    if (domNode) {
      domNode.scrollIntoView({ behavior: 'smooth', block: 'center' })

      // 添加一个短暂的闪烁高亮（复用你代码里已有的类名）
      domNode.classList.add('ai-highlight-flash')
      setTimeout(() => {
        domNode.classList.remove('ai-highlight-flash')
      }, 2500)
    }
  }

  return (
    <div className={`shrink-0 border-r border-border bg-muted/10 overflow-y-auto hidden md:flex flex-col h-full transition-all duration-300 ease-in-out ${isCollapsed ? 'w-12' : 'w-64'}`}>
      <div className={`p-4 font-semibold text-sm border-b border-border text-foreground flex items-center ${isCollapsed ? 'justify-center px-0' : 'justify-between'}`}>
        {!isCollapsed && <span className="whitespace-nowrap overflow-hidden">大纲目录</span>}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors shrink-0"
          title={isCollapsed ? "展开目录" : "收起目录"}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
      
      {!isCollapsed && (
        <>
          {items.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground text-center mt-4">
              暂无目录
            </div>
          ) : (
            <div className="p-2 space-y-1">
            {items.map((item) => (
              <button
                key={item.id}
                onClick={(e) => handleItemClick(e, item.pos)}
                className="block w-full text-left px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors truncate"
                style={{
                  paddingLeft: `${(item.level - 1) * 12 + 8}px`, // 根据标题层级缩进
                  fontWeight: item.level === 1 ? 600 : 400
                }}
                title={item.text}
              >
                {item.text}
              </button>
            ))}
          </div>
          )}
        </>
      )}
    </div>
  )
}