"use client"

import * as React from "react"
import { FileText } from "lucide-react"

export default function NotesPage() {
    return (
        <main className="flex flex-1 flex-col gap-6 p-6 lg:gap-10 lg:p-10 overflow-auto">
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground animate-in fade-in zoom-in duration-500 mt-20">
                <FileText className="h-16 w-16 mb-4 text-muted-foreground/50" />
                <h1 className="text-2xl font-bold tracking-tight text-foreground">全部文档</h1>
                <p className="mt-2 text-sm">这里是你的所有文档库。功能正在开发中...</p>
            </div>
        </main>
    )
}
