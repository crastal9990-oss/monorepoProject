"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { FileText, Plus } from "lucide-react"
import { getDocumentList, createNewDocument } from "@/actions/document"
import { getFolderList } from "@/actions/folder"
import { RecentNoteCard, Note } from "@/components/dashboard/recent-note-card"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { createClient } from '@/utils/supabase/client'
import { toast, Button } from "@repo/ui"

export default function NotesPage() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const folderId = searchParams.get('folderId')

    const [notes, setNotes] = useState<Note[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [folders, setFolders] = useState<any[]>([])
    const [isCreatingDoc, setIsCreatingDoc] = useState(false)

    const currentFolder = folders.find(f => f.id === folderId)

    const fetchFolders = () => {
        getFolderList().then((res) => {
            if (res.success && res.data) {
                setFolders(res.data)
            }
        })
    }

    const fetchNotes = () => {
        setIsLoading(true)
        getDocumentList(undefined, folderId)
            .then((res) => {
                if (res?.data) {
                    const mappedNotes = res.data.map((doc: any) => ({
                        id: doc.id,
                        title: doc.title,
                        excerpt: doc.excerpt,
                        date: new Date(doc.updated_at).toLocaleDateString(),
                        tag: "文档"
                    }))
                    setNotes(mappedNotes)
                    localStorage.setItem(`notes_cache_${folderId || 'all'}`, JSON.stringify(mappedNotes))
                }
            })
            .catch((err) => {
                console.error('获取笔记列表失败', err)
            })
            .finally(() => {
                setIsLoading(false)
            })
    }

    // 初始化加载
    useEffect(() => {
        const cachedNotes = localStorage.getItem(`notes_cache_${folderId || 'all'}`)
        if (cachedNotes) {
            setNotes(JSON.parse(cachedNotes))
            setIsLoading(false)
        }
        fetchFolders()
    }, [])

    // 监听 folderId 变化以重新获取数据并设置 Supabase 监听
    useEffect(() => {
        fetchNotes()

        const supabase = createClient()
        const channelDocs = supabase
            .channel('notes-page-documents')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'documents' },
                () => { fetchNotes() }
            )
            .subscribe()

        const channelFolders = supabase
            .channel('notes-page-folders')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'folders' },
                () => { fetchFolders() }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channelDocs)
            supabase.removeChannel(channelFolders)
        }
    }, [folderId])

    const handleCreateDoc = async () => {
        setIsCreatingDoc(true)
        const res = await createNewDocument(folderId || undefined)
        if (res.success) {
            toast.success("文档创建成功")
            router.push(`/notes/${res.id}`)
        } else {
            toast.error(res.error || "创建失败")
            setIsCreatingDoc(false)
        }
    }



    return (
        <main className="flex flex-1 flex-col gap-6 p-6 lg:gap-10 lg:p-10 overflow-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 pb-5">
                <div className="flex items-center gap-2">
                    <FileText className="h-6 w-6 text-primary" />
                    <div className="flex items-center gap-1.5">
                        <Link href="/notes" className="text-xl font-medium text-muted-foreground hover:text-foreground transition-colors">
                            全部文档
                        </Link>
                        {currentFolder && (
                            <>
                                <span className="text-muted-foreground/50">/</span>
                                <span className="text-xl font-bold tracking-tight text-foreground">{currentFolder.name}</span>
                            </>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2">

                    <Button
                        onClick={handleCreateDoc}
                        disabled={isCreatingDoc}
                        size="sm"
                        className="h-9 px-4 text-xs gap-1.5 shadow-sm transition-all"
                    >
                        {isCreatingDoc ? (
                            <>
                                <span className="h-3.5 w-3.5 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin shrink-0" />
                                创建中...
                            </>
                        ) : (
                            <>
                                <Plus className="h-4 w-4" />
                                新建文档
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {isLoading ? (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-32 rounded-xl bg-muted/60 animate-pulse border border-border/50" />
                    ))}
                </div>
            ) : notes.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground animate-in fade-in zoom-in duration-500 mt-20">
                    <FileText className="h-16 w-16 mb-4 text-muted-foreground/50" />
                    <p className="mt-2 text-sm text-center">这里是你的文档库<br />当前目录下还没有任何文档，快去创建一个吧！</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {notes.map((note) => (
                        <Link href={`/notes/${note.id}`} key={note.id}>
                            <RecentNoteCard note={note} />
                        </Link>
                    ))}
                </div>
            )}
        </main>
    )
}
