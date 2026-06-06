"use client"

import * as React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { Search, FileText, Loader2, X, Sparkles, ArrowRight } from "lucide-react"
import { searchDocuments } from "@/api/search"
import { useRouter } from "next/navigation"

interface SearchResult {
    id: string
    title: string
    excerpt: string
    tags: string[]
    score: number
}

export function SearchCommand() {
    const router = useRouter()
    const [isFocused, setIsFocused] = useState(false)
    const [query, setQuery] = useState("")
    const [results, setResults] = useState<SearchResult[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [activeIndex, setActiveIndex] = useState(0)
    const inputRef = useRef<HTMLInputElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const searchTimer = useRef<NodeJS.Timeout | null>(null)
    const resultRefs = useRef<(HTMLButtonElement | null)[]>([])

    // 是否显示下拉面板：聚焦状态 且 (有输入 或 正在加载)
    const showDropdown = isFocused && (query.trim().length > 0)

    // 关闭下拉
    const closeDropdown = useCallback(() => {
        setIsFocused(false)
    }, [])

    // Cmd/Ctrl + K 全局快捷键
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault()
                inputRef.current?.focus()
                setIsFocused(true)
            }
            if (e.key === "Escape" && isFocused) {
                inputRef.current?.blur()
                closeDropdown()
            }
        }
        document.addEventListener("keydown", handleKeyDown)
        return () => document.removeEventListener("keydown", handleKeyDown)
    }, [isFocused, closeDropdown])

    // 点击外部关闭
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                closeDropdown()
            }
        }
        if (isFocused) {
            document.addEventListener("mousedown", handleClickOutside)
        }
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [isFocused, closeDropdown])

    // 防抖搜索
    useEffect(() => {
        if (searchTimer.current) clearTimeout(searchTimer.current)

        if (!query.trim()) {
            setResults([])
            setIsLoading(false)
            return
        }

        setIsLoading(true)
        searchTimer.current = setTimeout(async () => {
            try {
                const res = await searchDocuments(query)
                if (res.success && res.data) {
                    setResults(res.data)
                    setActiveIndex(0)
                }
            } catch (err) {
                console.error("搜索出错:", err)
            } finally {
                setIsLoading(false)
            }
        }, 600)

        return () => {
            if (searchTimer.current) clearTimeout(searchTimer.current)
        }
    }, [query])

    // 键盘导航
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!showDropdown || results.length === 0) return

        if (e.key === "ArrowDown") {
            e.preventDefault()
            setActiveIndex(prev => Math.min(prev + 1, results.length - 1))
        } else if (e.key === "ArrowUp") {
            e.preventDefault()
            setActiveIndex(prev => Math.max(prev - 1, 0))
        } else if (e.key === "Enter") {
            e.preventDefault()
            navigateToResult(results[activeIndex])
        }
    }

    // 滚动选中项到视口
    useEffect(() => {
        resultRefs.current[activeIndex]?.scrollIntoView({ block: "nearest" })
    }, [activeIndex])

    // 跳转到结果
    const navigateToResult = (result: SearchResult) => {
        closeDropdown()
        setQuery("")
        setResults([])
        router.push(`/notes/${result.id}`)
    }

    // 清空输入
    const handleClear = () => {
        setQuery("")
        setResults([])
        inputRef.current?.focus()
    }

    // 高亮匹配关键字
    const highlightText = (text: string, keyword: string) => {
        if (!keyword.trim() || !text) return text || "无标题文稿"
        const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const regex = new RegExp(`(${escaped})`, 'gi')
        const parts = text.split(regex)
        return parts.map((part, i) =>
            regex.test(part)
                ? <mark key={i} className="bg-primary/20 text-primary rounded-sm px-0.5 font-semibold">{part}</mark>
                : part
        )
    }

    return (
        <div ref={containerRef} className="relative max-w-md w-full">
            {/* 搜索输入框 */}
            <div className={`relative group transition-all duration-300 ${isFocused ? "ring-1 ring-foreground/20 rounded-md shadow-sm" : ""}`}>
                {isLoading ? (
                    <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary animate-spin" />
                ) : (
                    <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors duration-300 ${isFocused ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"}`} />
                )}
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onKeyDown={handleKeyDown}
                    placeholder="搜索标题、内容或标签..."
                    className="w-full bg-muted/30 pl-9 pr-16 py-2 shadow-sm border border-border/50 focus:bg-background focus:border-transparent focus:outline-none transition-all duration-300 rounded-md text-[13px] font-medium"
                />
                {/* 右侧：清空按钮 或 快捷键提示 */}
                {query ? (
                    <button
                        onClick={handleClear}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                ) : (
                    <kbd className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-border/60 bg-muted/50 px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                        <span className="text-xs">⌘</span>K
                    </kbd>
                )}
            </div>

            {/* 搜索结果下拉面板 */}
            {showDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-background border border-border/60 rounded-xl shadow-xl shadow-black/10 overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="overflow-y-auto" style={{ maxHeight: "360px" }}>
                        {/* 加载中 */}
                        {isLoading && results.length === 0 && (
                            <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground/60">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span className="text-sm">正在搜索...</span>
                            </div>
                        )}

                        {/* 无结果 */}
                        {!isLoading && query.trim() && results.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground/60">
                                <Search className="h-6 w-6 mb-2" />
                                <p className="text-sm font-medium">没有找到相关文档</p>
                                <p className="text-xs mt-0.5">试试换个关键词？</p>
                            </div>
                        )}

                        {/* 结果列表 */}
                        {results.length > 0 && (
                            <div className="p-1.5">
                                <div className="px-2.5 py-1.5 flex items-center justify-between">
                                    <span className="text-[11px] font-medium text-muted-foreground/70 uppercase tracking-wider">
                                        找到 {results.length} 个结果
                                    </span>
                                    <span className="text-[10px] text-muted-foreground/50 flex items-center gap-1">
                                        <Sparkles className="h-2.5 w-2.5" />
                                        语义搜索
                                    </span>
                                </div>
                                {results.map((result, index) => (
                                    <button
                                        key={result.id}
                                        ref={(el) => { resultRefs.current[index] = el }}
                                        onClick={() => navigateToResult(result)}
                                        onMouseEnter={() => setActiveIndex(index)}
                                        className={`w-full text-left px-2.5 py-2.5 rounded-lg flex items-start gap-2.5 transition-all duration-150 ${
                                            index === activeIndex
                                                ? "bg-accent text-accent-foreground"
                                                : "hover:bg-muted/50"
                                        }`}
                                    >
                                        <div className={`shrink-0 mt-0.5 p-1 rounded-md transition-colors ${
                                            index === activeIndex
                                                ? "bg-primary/15 text-primary"
                                                : "bg-muted text-muted-foreground"
                                        }`}>
                                            <FileText className="h-3.5 w-3.5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold truncate leading-snug">
                                                {highlightText(result.title, query)}
                                            </p>
                                            {result.excerpt && (
                                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 leading-relaxed">
                                                    {highlightText(result.excerpt, query)}
                                                </p>
                                            )}
                                        </div>
                                        <ArrowRight className={`h-3.5 w-3.5 shrink-0 mt-1 transition-all ${
                                            index === activeIndex
                                                ? "opacity-100 text-primary translate-x-0"
                                                : "opacity-0 -translate-x-2"
                                        }`} />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* 底部快捷键提示 */}
                    {results.length > 0 && (
                        <div className="flex items-center gap-3 px-3 py-1.5 border-t border-border/30 text-[10px] text-muted-foreground/50">
                            <span className="flex items-center gap-1">
                                <kbd className="px-1 py-0.5 rounded bg-muted/60 border border-border/40 font-mono">↑↓</kbd>
                                导航
                            </span>
                            <span className="flex items-center gap-1">
                                <kbd className="px-1 py-0.5 rounded bg-muted/60 border border-border/40 font-mono">↵</kbd>
                                打开
                            </span>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
