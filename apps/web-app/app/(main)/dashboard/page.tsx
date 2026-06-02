"use client"

import * as React from "react"
import { Sparkles, FilePlus, Import, ArrowRight } from "lucide-react"
import { Button, Card, CardContent, CardHeader, CardTitle } from "@repo/ui"
import { RecentNoteCard, Note } from "../../../components/dashboard/recent-note-card"

// 模拟数据 (优化了时间与标签的中文表达)
const recentNotes: Note[] = [
    { id: 1, title: "SAD-LMLIIF 模型架构与渲染推导", excerpt: "在处理任意尺度超分辨率时，利用频率感知特征编码可以有效减少伪影。需要重点优化 CMSR 模块的搜索循环逻辑...", date: "2 小时前", tag: "计算机视觉" },
    { id: 2, title: "Supabase RBAC 权限设计方案", excerpt: "结合 JWT token，在 PostgreSQL 的 RLS 中配置不同角色的表级别访问策略，确保租户数据隔离...", date: "昨天", tag: "后端架构" },
    { id: 3, title: "Next.js 首屏加载与 Tree-Shaking 优化", excerpt: "分析打出来的 bundle 大小，尽量将重型图表库采用 next/dynamic 进行懒加载，减少首屏阻塞时间...", date: "5月 12日", tag: "前端工程化" },
    { id: 4, title: "本周工作复盘与下周 Todo", excerpt: "1. 修复了批量处理脚本的问题，已改为单图可视化处理。 2. 准备搭建基础的协作文档平台...", date: "5月 10日", tag: "项目管理" }
]

// --- 页面主组件 ---
export default function DashboardPage() {
    return (
        <main className="flex flex-1 flex-col gap-6 p-6 lg:gap-10 lg:p-10 overflow-auto">

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">欢迎回来 👋</h1>
                    <p className="text-sm text-muted-foreground mt-2">今天想记录点什么？或者让 AI 帮你整理思绪。</p>
                </div>
            </div>

            {/* 快捷操作区 */}
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

                <Card className="cursor-pointer border border-border/50 bg-background shadow-sm transition-all duration-500 ease-out hover:shadow-lg hover:-translate-y-1 hover:border-foreground/50 group">
                    <CardHeader className="flex flex-row items-center space-y-0 pb-2 gap-2">
                        <FilePlus className="h-4 w-4 text-muted-foreground transition-all duration-300 group-hover:text-foreground group-hover:scale-110" />
                        <CardTitle className="text-[15px] font-semibold tracking-wide">新建空白文稿</CardTitle>
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

            {/* 最近笔记网格 */}
            <div className="mt-2">
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-[17px] font-semibold tracking-tight text-foreground">最近活动</h2>
                    <Button variant="ghost" size="sm" className="text-[13px] font-medium text-muted-foreground group">
                        查看全部
                        <ArrowRight className="ml-1 h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                    </Button>
                </div>

                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    {recentNotes.map((note) => (
                        <RecentNoteCard key={note.id} note={note} />
                    ))}
                </div>
            </div>

        </main>
    )
}