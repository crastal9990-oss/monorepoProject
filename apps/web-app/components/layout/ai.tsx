'use client'

import React, { useState, useRef, useEffect } from "react"
import { useParams } from "next/navigation"
import { useChat } from "@ai-sdk/react"
import { Button, Input, ScrollArea, Separator } from "@repo/ui" // 建议引入 ScrollArea 和 Input
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
    DrawerFooter,
} from "@repo/ui"
import { Send, Bot, User, Loader2, Sparkles, BookOpen } from "lucide-react"

import { DefaultChatTransport } from "ai"

export function AiAssistantDrawer() {
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
        <Drawer direction="right">
            <DrawerTrigger asChild>
                <Button variant="outline" className="gap-2 shadow-sm hover:shadow">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    AI 助手
                </Button>
            </DrawerTrigger>
            <DrawerContent className="h-screen top-0 right-0 left-auto mt-0 w-full sm:w-[450px] rounded-none flex flex-col bg-background border-l">
                <DrawerHeader className="border-b px-6 py-4 flex justify-between items-center shrink-0">
                    <div className="flex flex-col gap-1">
                        <DrawerTitle className="flex items-center gap-2 text-lg font-semibold">
                            <Bot className="h-5 w-5 text-blue-500" />
                            AI 知识库助手
                        </DrawerTitle>
                        <DrawerDescription className="text-xs text-muted-foreground">
                            基于文档内容实时问答
                        </DrawerDescription>
                    </div>
                    <DrawerClose asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">✕</Button>
                    </DrawerClose>
                </DrawerHeader>

                {/* 提问范围选择 - 优化样式 */}
                <div className="flex p-2 gap-1 border-b bg-muted/30">
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

                {/* 聊天记录区域 - 使用 ScrollArea */}
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

                            return (
                                <div key={m.id} className={`flex items-start gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
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
                            )
                        })}
                        <div ref={messagesEndRef} />
                    </div>
                </ScrollArea>

                {/* 输入框区域 - 统一圆角和边框 */}
                <DrawerFooter className="border-t p-4 shrink-0 bg-background">
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
                </DrawerFooter>
            </DrawerContent>
        </Drawer>
    )
}
