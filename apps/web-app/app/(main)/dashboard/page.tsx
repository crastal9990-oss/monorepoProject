"use client"

import * as React from "react"
import { useState, useEffect, useTransition } from "react" // 🌟 新增 useState, useEffect
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Sparkles, FilePlus, Import, ArrowRight, Loader2, X } from "lucide-react"
import {
    Button, Card, CardContent, CardHeader, CardTitle,
    AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
    AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction
} from "@repo/ui"
import { RecentNoteCard, Note } from "@/components/dashboard/recent-note-card"
import { toast } from '@repo/ui'
import { createNewDocument, getDocumentList, deleteDocument } from "@/actions/document"
import { createClient } from '@/utils/supabase/client'

export default function DashboardPage() {
    const router = useRouter()
    const [isPending, setIsPending] = useState(false)

    const [recentNotes, setRecentNotes] = useState<Note[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [noteToDelete, setNoteToDelete] = useState<Note | null>(null)

    useEffect(() => {
        const cachedNotes = localStorage.getItem('dashboard_recent_notes')
        if (cachedNotes) {
            setRecentNotes(JSON.parse(cachedNotes))
            setIsLoading(false)
        }

        let fetchTimer: NodeJS.Timeout | null = null;
        const supabase = createClient()

        const fetchNotes = async () => {
            try {
                const { data, error } = await supabase
                    .from('documents')
                    .select('*')
                    .eq('is_trashed', false)
                    .order('updated_at', { ascending: false })
                    .limit(4)

                if (data) {
                    const mappedNotes = data.map((doc: any) => ({
                        id: doc.id,
                        title: doc.title,
                        excerpt: doc.excerpt,
                        date: new Date(doc.updated_at).toLocaleDateString('zh-CN', {
                            year: 'numeric', month: 'short', day: 'numeric'
                        }),
                        tag: doc.tags?.[0] || "默认分类"
                    }))
                    setRecentNotes(mappedNotes)
                    localStorage.setItem('dashboard_recent_notes', JSON.stringify(mappedNotes))
                }
            } catch (err) {
                console.error('获取笔记列表失败', err)
            } finally {
                setIsLoading(false)
            }
        }

        fetchNotes()

        // Supabase Realtime：监听 documents 表的任意变更，实时刷新列表
        const channel = supabase
            .channel('dashboard-page-documents')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'documents' },
                () => {
                    // 防抖处理：500ms 内如果有多次数据库更新，只拉取一次列表
                    if (fetchTimer) clearTimeout(fetchTimer)
                    fetchTimer = setTimeout(() => fetchNotes(), 500)
                }
            )
            .subscribe()

        return () => {
            if (fetchTimer) clearTimeout(fetchTimer)
            supabase.removeChannel(channel)
        }
    }, [])

    const handleDeleteRequest = (id: string | number) => {
        const note = recentNotes.find(n => n.id === id);
        if (note) setNoteToDelete(note);
    };

    const confirmDelete = async () => {
        if (!noteToDelete) return;
        try {
            const res = await deleteDocument(String(noteToDelete.id));
            if (res?.success) {
                toast.success('笔记已删除');

                // 删除成功后重新请求最新的数据
                const listRes = await getDocumentList(4);
                if (listRes?.data) {
                    const mappedNotes = listRes.data.map((doc: any) => ({
                        id: doc.id,
                        title: doc.title,
                        excerpt: doc.excerpt,
                        date: new Date(doc.updated_at).toLocaleDateString('zh-CN', {
                            year: 'numeric', month: 'short', day: 'numeric'
                        }),
                        tag: doc.tags?.[0] || "默认分类"
                    }));
                    setRecentNotes(mappedNotes);
                    localStorage.setItem('dashboard_recent_notes', JSON.stringify(mappedNotes));
                } else {
                    toast.error(listRes?.error || '刷新列表失败');
                }
                setNoteToDelete(null);
            } else {
                toast.error(res?.error || '删除失败');
            }
        } catch (err: any) {
            toast.error(err.message || '删除出错，请重试');
        }
    };

    const handleCreateNew = async () => {
        setIsPending(true)
        try {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                toast.error('未登录或登录状态已过期')
                setTimeout(() => window.location.reload(), 1500)
                return
            }

            // 直接从客户端写入数据库，速度极快，免去 Server Action 的开销
            const { data, error } = await supabase
                .from('documents')
                .insert([
                    {
                        user_id: user.id,
                        title: '',
                        excerpt: '开始你的记录...'
                    }
                ])
                .select()
                .single()

            if (error || !data) throw error

            router.push(`/notes/${data.id}`)
        } catch (err: any) {
            toast.error(err.message || '网络请求失败，请重试')
            setIsPending(false)
        }
    }

    return (
        <main className="flex flex-1 flex-col gap-6 p-6 lg:gap-10 lg:p-10 overflow-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">欢迎回来</h1>
                    <p className="text-sm text-muted-foreground mt-2">今天想记录点什么？或者让 AI 帮你整理思绪。</p>
                </div>
            </div>

            {/* 快捷操作区 (保持不变) */}
            <div className="grid gap-5 md:grid-cols-3">
                <Card className="relative overflow-hidden cursor-pointer border-transparent bg-primary text-primary-foreground shadow-lg transition-all duration-500 ease-out hover:shadow-2xl hover:-translate-y-1 group">
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#8882_1px,transparent_1px),linear-gradient(to_bottom,#8882_1px,transparent_1px)] bg-[size:14px_14px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20 transition-opacity duration-500 group-hover:opacity-40" />

                    <CardHeader className="relative flex flex-row items-center space-y-0 pb-2 gap-2 z-10">
                        <Sparkles className="h-4 w-4 transition-transform duration-500 group-hover:scale-125 group-hover:rotate-12" />
                        <CardTitle className="text-[15px] font-semibold tracking-wide">AI 智能创作</CardTitle>
                    </CardHeader>
                    <CardContent className="relative z-10">
                        <div className="text-[13px] text-primary-foreground/70 leading-relaxed transition-colors duration-300 group-hover:text-primary-foreground">
                            输入一段灵感片段，让 AI 自动生成结构化大纲或进行文本润色。
                        </div>
                    </CardContent>
                </Card>

                <Card onClick={handleCreateNew}
                    className="cursor-pointer border border-border/50 bg-background shadow-sm transition-all duration-500 ease-out hover:shadow-lg hover:-translate-y-1 hover:border-foreground/50 group">
                    <CardHeader className="flex flex-row items-center space-y-0 pb-2 gap-2">
                        {isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        ) : (
                            <FilePlus className="h-4 w-4 text-muted-foreground transition-all duration-300 group-hover:text-foreground group-hover:scale-110" />
                        )}
                        <CardTitle className="text-[15px] font-semibold tracking-wide">
                            {isPending ? '创建中...' : '新建空白文稿'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-[13px] text-muted-foreground leading-relaxed transition-colors duration-300 group-hover:text-foreground/90">
                            开启沉浸式 Markdown 终端，专注于纯粹的文字输入与逻辑推导。
                        </div>
                    </CardContent>
                </Card>

                <Card className="cursor-pointer border border-border/50 bg-background shadow-sm transition-all duration-500 ease-out hover:shadow-lg hover:-translate-y-1 hover:border-foreground/50 group">
                    <CardHeader className="flex flex-row items-center space-y-0 pb-2 gap-2">
                        <Import className="h-4 w-4 text-muted-foreground transition-all duration-300 group-hover:text-foreground group-hover:scale-110" />
                        <CardTitle className="text-[15px] font-semibold tracking-wide">导入外部数据</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-[13px] text-muted-foreground leading-relaxed transition-colors duration-300 group-hover:text-foreground/90">
                            支持解析本地 Markdown、TXT 文件，或直接从系统剪贴板生成。
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* 最近活动 */}
            <div className="mt-2">
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-[17px] font-semibold tracking-tight text-foreground">最近活动</h2>
                    <Button variant="ghost" size="sm" className="text-[13px] font-medium text-muted-foreground group" asChild>
                        <Link href="/notes">
                            查看全部
                            <ArrowRight className="ml-1 h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                        </Link>
                    </Button>
                </div>

                {isLoading ? (
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="h-32 rounded-xl bg-muted/60 animate-pulse border border-border/50" />
                        ))}
                    </div>
                ) : recentNotes.length > 0 ? (
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                        {recentNotes.map((note) => (
                            <Link href={`/notes/${note.id}`} key={note.id} className="block outline-none">
                                <RecentNoteCard note={note} onDelete={handleDeleteRequest} />
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-12 px-4 text-center border border-dashed border-border rounded-xl bg-muted/20">
                        <FilePlus className="h-8 w-8 text-muted-foreground/50 mb-3" />
                        <p className="text-sm font-medium text-foreground">暂无笔记</p>
                        <p className="text-xs text-muted-foreground mt-1">点击上方“新建空白文稿”开始记录</p>
                    </div>
                )}
            </div>

            {/* 删除确认弹窗 */}
            <AlertDialog open={!!noteToDelete} onOpenChange={(open) => { if (!open) setNoteToDelete(null) }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>是否删除：{noteToDelete?.title}？</AlertDialogTitle>
                        <AlertDialogDescription>
                            删除的内容将进入回收站，30 天后自动彻底删除
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setNoteToDelete(null)}>取消</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete}>
                            删除
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </main>
    )
}