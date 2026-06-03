"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui"
import { Trash2 } from "lucide-react"

export interface Note {
    id: number | string;
    title: string;
    excerpt: string;
    date: string;
    tag: string;
}

interface RecentNoteCardProps {
    note: Note;
    onDelete?: (id: string | number) => void;
}

export function RecentNoteCard({ note, onDelete }: RecentNoteCardProps) {
    const handleDelete = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (onDelete) {
            onDelete(note.id);
        }
    };

    return (
        <Card className="h-full relative flex flex-col cursor-pointer border border-border/50 bg-background shadow-sm transition-all duration-500 ease-out hover:shadow-xl hover:-translate-y-1 hover:border-foreground/40 group overflow-hidden">
            {/* 科技感悬浮指示线 */}
            <div className="absolute left-0 top-0 h-full w-[3px] bg-primary scale-y-0 group-hover:scale-y-100 origin-top transition-transform duration-500 ease-out" />

            <CardHeader className="p-5 pb-3">
                <div className="flex justify-between items-start mb-3">
                    {/* 前缀 # 符号， */}
                    <span className="text-[11px] font-medium tracking-wide px-2 py-0.5 rounded-sm bg-muted text-muted-foreground transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
                        <span className="opacity-50 mr-0.5">#</span>{note.tag}
                    </span>
                    {/* 删除 */}
                    {onDelete && (
                        <button
                            onClick={handleDelete}
                            className="p-1.5 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors opacity-0 opacity-100 z-10"
                            title="删除笔记"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>
                {/* 标题 */}
                <CardTitle className="text-[15px] font-semibold line-clamp-2 leading-relaxed transition-transform duration-300 group-hover:translate-x-1">
                    {note.title || "无标题文稿"}
                </CardTitle>
            </CardHeader>
            {/* 摘要 */}
            <CardContent className="p-5 pt-0 flex-1 flex flex-col justify-between">
                <p className="text-[13px] text-muted-foreground line-clamp-3 mb-5 leading-[1.6] transition-colors duration-300 group-hover:text-foreground/80">
                    {note.excerpt || "暂无内容"}
                </p>
                {/* 时间 */}
                <p className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-border group-hover:bg-primary transition-colors" />
                    {note.date}
                </p>
            </CardContent>
        </Card>
    )
}
