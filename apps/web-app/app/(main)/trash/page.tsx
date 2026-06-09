"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { Trash2 } from "lucide-react"
import { getTrashedDocumentList } from "@/actions/document"
import { RecentNoteCard, Note } from "@/components/dashboard/recent-note-card"

export default function TrashPage() {
    const [notes, setNotes] = useState<Note[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const cachedNotes = localStorage.getItem('trashed_notes_cache')
        if (cachedNotes) {
            setNotes(JSON.parse(cachedNotes))
            setIsLoading(false)
        }

        getTrashedDocumentList()
            .then((res) => {
                if (res?.data) {
                    const mappedNotes = res.data.map((doc: any) => ({
                        id: doc.id,
                        title: doc.title,
                        excerpt: doc.excerpt,
                        date: new Date(doc.updated_at).toLocaleDateString(),
                        tag: "已删除"
                    }))
                    setNotes(mappedNotes)
                    localStorage.setItem('trashed_notes_cache', JSON.stringify(mappedNotes))
                }
            })
            .catch((err) => {
                console.error('获取回收站列表失败', err)
            })
            .finally(() => {
                setIsLoading(false)
            })
    }, [])

    return (
        <main className="flex flex-1 flex-col gap-6 p-6 lg:gap-10 lg:p-10 overflow-auto">
            <div className="flex items-center gap-2 mb-2">
                <Trash2 className="h-6 w-6 text-destructive" />
                <h1 className="text-2xl font-bold tracking-tight text-foreground">回收站</h1>
            </div>

            {isLoading ? (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-32 rounded-xl bg-muted/60 animate-pulse border border-border/50" />
                    ))}
                </div>
            ) : notes.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground animate-in fade-in zoom-in duration-500 mt-20">
                    <Trash2 className="h-16 w-16 mb-4 text-muted-foreground/50" />
                    <p className="mt-2 text-sm text-center">你的回收站是空的</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {notes.map((note) => (
                        <RecentNoteCard key={note.id} note={note} />
                    ))}
                </div>
            )}
        </main>
    )
}
