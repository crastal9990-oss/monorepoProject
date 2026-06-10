'use client'

import React, { useState, useRef, useEffect } from "react"
import { useParams } from "next/navigation"
import { useChat } from "@ai-sdk/react"
import { Button, Input, ScrollArea } from "@repo/ui"
import { Send, Bot, User, Loader2, Sparkles, BookOpen } from "lucide-react"
import { DefaultChatTransport } from "ai"

interface AiAssistantPanelProps {
    isOpen: boolean
    onClose: () => void
}

export function AiAssistantPanel({ isOpen, onClose }: AiAssistantPanelProps) {
    const params = useParams()
    const currentNoteId = params?.id as string | undefined
    const [searchScope, setSearchScope] = useState<'document' | 'workspace'>('document')
    const [inputValue, setInputValue] = useState('')
    const messagesEndRef = useRef<HTMLDivElement>(null)

    // 使用 ref 追踪最新的 searchScope，避免闭包陷阱和重渲染丢失 transport 引用
    const searchScopeRef = useRef(searchScope)
    useEffect(() => {
        searchScopeRef.current = searchScope
    }, [searchScope])

    // 重新引入 DefaultChatTransport，并使用动态方法 () => object 获取最新状态
    const transport = React.useMemo(() => new DefaultChatTransport({
        api: '/api/chat',
        body: () => ({
            currentNoteId: searchScopeRef.current === 'document' ? currentNoteId : null,
        })
    }), [currentNoteId])

    const { messages, sendMessage, status } = useChat({
        transport
    })

    const isLoading = status === 'submitted' || status === 'streaming'

    // 自动滚动到底部
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        const trimmed = inputValue.trim()
        if (!trimmed || isLoading) return
        sendMessage({ text: trimmed })
        setInputValue('')
    }

    return (
        <div
            className={`h-full flex flex-col bg-background border-l shrink-0 transition-all duration-300 ease-in-out overflow-hidden z-30 ${
                isOpen ? 'w-full sm:w-[420px] border-border opacity-100' : 'w-0 border-transparent opacity-0 pointer-events-none'
            }`}
        >
            <div className="flex flex-col h-full w-full sm:w-[420px]">
                {/* 顶部标题区 */}
                <div className="border-b px-6 py-4 flex justify-between items-center shrink-0">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-lg font-semibold text-foreground">
                            <Bot className="h-5 w-5 text-blue-500" />
                            AI 知识库助手
                        </div>
                        <div className="text-xs text-muted-foreground">
                            基于文档内容实时问答
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full">✕</Button>
                </div>

                {/* 提问范围选择 */}
                <div className="flex p-2 gap-1 border-b bg-muted/30 shrink-0">
                    {['document', 'workspace'].map((scope) => (
                        <Button
                            key={scope}
                            variant={searchScope === scope ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setSearchScope(scope as any)}
                            className={`flex-1 h-8 text-xs font-medium ${searchScope !== scope ? 'text-muted-foreground' : ''}`}
                        >
                            {scope === 'document' ? '当前文档' : <><BookOpen className="h-3 w-3 mr-1" />全库搜索</>}
                        </Button>
                    ))}
                </div>

                {/* 聊天记录区域 */}
                <ScrollArea className="flex-1 w-full px-4 py-6">
                    <div className="flex flex-col gap-6">
                        {messages.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground/60">
                                <Bot className="h-16 w-16 mb-4 stroke-[1]" />
                                <p className="text-sm">开启你的智能对话</p>
                            </div>
                        )}

                        {messages.map((m) => {
                            const isUser = m.role === 'user'
                            const textContent = m.parts?.filter((p: any) => p.type === 'text').map((p: any) => p.text).join('') ?? ''
                            const sources = (m.metadata as any)?.sources || []

                            return (
                                <div key={m.id} className="flex flex-col gap-2">
                                    <div className={`flex items-start gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
                                        {!isUser && (
                                            <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0 border border-blue-500/20">
                                                <Bot className="h-5 w-5 text-blue-600" />
                                            </div>
                                        )}
                                        <div className={`px-4 py-3 rounded-2xl max-w-[85%] text-sm shadow-sm ${isUser
                                            ? 'bg-primary text-primary-foreground rounded-br-none'
                                            : 'bg-muted/50 text-foreground border rounded-bl-none'
                                            }`}>
                                            <div className="whitespace-pre-wrap leading-relaxed">{textContent}</div>
                                        </div>
                                        {isUser && (
                                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                                                <User className="h-5 w-5" />
                                            </div>
                                        )}
                                    </div>

                                    {/* 渲染参考资料卡片 */}
                                    {!isUser && sources.length > 0 && (
                                        <div className="ml-11 mt-1 pr-6 flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                                            <div className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                                                <BookOpen className="h-3 w-3 text-blue-500" />
                                                参考来源:
                                            </div>
                                            <div className="flex flex-col gap-1.5">
                                                {sources.map((src: any, sIdx: number) => (
                                                    <button
                                                        key={sIdx}
                                                        onClick={() => {
                                                            const event = new CustomEvent('ai-highlight-text', {
                                                                detail: { text: src.chunk_content, documentId: src.document_id }
                                                            });
                                                            window.dispatchEvent(event);
                                                        }}
                                                        className="group text-left p-2 rounded-lg bg-muted/40 border border-border/50 hover:bg-muted/80 hover:border-primary/30 transition-all text-xs flex flex-col gap-0.5"
                                                    >
                                                        <div className="font-medium text-foreground/80 flex items-center justify-between">
                                                            <span className="truncate max-w-[75%]">[{sIdx + 1}] {src.document_title}</span>
                                                            <span className="text-[10px] text-primary/70 opacity-0 group-hover:opacity-100 transition-opacity font-normal">点击定位高亮</span>
                                                        </div>
                                                        <div className="text-muted-foreground line-clamp-2 leading-relaxed font-normal">{src.chunk_content}</div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                        <div ref={messagesEndRef} />
                    </div>
                </ScrollArea>

                {/* 输入框区域 */}
                <div className="border-t p-4 shrink-0 bg-background">
                    <form onSubmit={handleFormSubmit} className="flex gap-2 w-full items-center">
                        <Input
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="请输入问题..."
                            className="flex-1 h-10 shadow-sm"
                            disabled={isLoading}
                        />
                        <Button type="submit" disabled={isLoading || !inputValue.trim()} size="icon" className="h-10 w-10 shrink-0">
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    )
}
