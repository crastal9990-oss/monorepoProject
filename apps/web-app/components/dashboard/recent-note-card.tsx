"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui"

export interface Note {
    id: number | string;
    title: string;
    excerpt: string;
    date: string;
    tag: string;
}

interface RecentNoteCardProps {
    note: Note;
}

export function RecentNoteCard({ note }: RecentNoteCardProps) {
    return (
        <Card className="relative flex flex-col cursor-pointer border border-border/50 bg-background shadow-sm transition-all duration-500 ease-out hover:shadow-xl hover:-translate-y-1 hover:border-foreground/40 group overflow-hidden">
            {/* 科技感悬浮指示线 (左侧展开) */}
            <div className="absolute left-0 top-0 h-full w-[3px] bg-primary scale-y-0 group-hover:scale-y-100 origin-top transition-transform duration-500 ease-out" />

            <CardHeader className="p-5 pb-3">
                <div className="flex justify-between items-center mb-3">
                    {/* Tag 优化：前缀 # 符号，更有极客感 */}
                    <span className="text-[11px] font-medium tracking-wide px-2 py-0.5 rounded-sm bg-muted text-muted-foreground transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
                        <span className="opacity-50 mr-0.5">#</span>{note.tag}
                    </span>
                </div>
                {/* 标题优化：稍微加大行高，字重改为半粗体 */}
                <CardTitle className="text-[15px] font-semibold line-clamp-2 leading-relaxed transition-transform duration-300 group-hover:translate-x-1">
                    {note.title}
                </CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0 flex-1 flex flex-col justify-between">
                <p className="text-[13px] text-muted-foreground line-clamp-3 mb-5 leading-[1.6] transition-colors duration-300 group-hover:text-foreground/80">
                    {note.excerpt}
                </p>
                <p className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-border group-hover:bg-primary transition-colors" />
                    {note.date}
                </p>
            </CardContent>
        </Card>
    )
}
