"use client"

import * as React from "react"
import { Network } from "lucide-react"

export default function GraphPage() {
    return (
        <main className="flex flex-1 flex-col gap-6 p-6 lg:gap-10 lg:p-10 overflow-auto">
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground animate-in fade-in zoom-in duration-500 mt-20">
                <Network className="h-16 w-16 mb-4 text-muted-foreground/50" />
                <h1 className="text-2xl font-bold tracking-tight text-foreground">知识图谱</h1>
                <p className="mt-2 text-sm">在这里探索你的知识网络连结。功能正在开发中...</p>
            </div>
        </main>
    )
}
