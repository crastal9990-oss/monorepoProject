"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { FileText } from "lucide-react"
import { getDocumentList } from "@/api/document"
import { RecentNoteCard, Note } from "@/components/dashboard/recent-note-card"
import Link from "next/link"

export default function NotesPage() {
    const [notes, setNotes] = useState<Note[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const cachedNotes = localStorage.getItem('all_notes_cache')
        if (cachedNotes) {
            setNotes(JSON.parse(cachedNotes))
            setIsLoading(false)
        }

        getDocumentList()
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
                    localStorage.setItem('all_notes_cache', JSON.stringify(mappedNotes))
                }
            })
            .catch((err) => {
                console.error('获取笔记列表失败', err)
            })
            .finally(() => {
                setIsLoading(false)
            })
    }, [])

    return (
        <main className="flex flex-1 flex-col gap-6 p-6 lg:gap-10 lg:p-10 overflow-auto">
            <div className="flex items-center gap-2 mb-2">
                <FileText className="h-6 w-6 text-primary" />
                <h1 className="text-2xl font-bold tracking-tight text-foreground">全部文档</h1>
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
                    <p className="mt-2 text-sm text-center">这里是你的所有文档库<br/>还没有任何文档，快去创建一个吧！</p>
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
