"use client"

import * as React from "react"
import Link from "next/link"
import { Button, Input, Card, CardContent, CardHeader, CardTitle, CardDescription } from "@repo/ui"

// 模拟的最近笔记数据
const recentNotes = [
    {
        id: 1,
        title: "SAD-LMLIIF 模型架构与渲染推导",
        excerpt: "在处理任意尺度超分辨率时，利用频率感知特征编码可以有效减少伪影。需要重点优化 CMSR 模块的搜索循环逻辑...",
        date: "2 小时前",
        tag: "计算机视觉",
    },
    {
        id: 2,
        title: "Supabase RBAC 权限设计方案",
        excerpt: "结合 JWT token，在 PostgreSQL 的 RLS (Row Level Security) 中配置不同角色的表级别访问策略...",
        date: "昨天",
        tag: "后端架构",
    },
    {
        id: 3,
        title: "Next.js 首屏加载与 Tree-Shaking 优化",
        excerpt: "分析打出来的 bundle 大小，尽量将重型图表库采用 next/dynamic 进行懒加载，减少首屏阻塞时间...",
        date: "5 月 12 日",
        tag: "前端工程化",
    },
    {
        id: 4,
        title: "本周工作复盘与下周 Todo",
        excerpt: "1. 修复了批量处理脚本的问题，已改为单图可视化处理。 2. 准备搭建基础的协作文档平台...",
        date: "5 月 10 日",
        tag: "个人管理",
    }
]

export default function DashboardPage() {
    return (
        <div className="flex min-h-screen w-full bg-background">

            {/* 1. 左侧边栏 (Sidebar) */}
            <aside className="hidden w-64 flex-col border-r bg-muted/20 md:flex">
                <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
                    <Link href="/" className="flex items-center gap-2 font-semibold text-primary">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-indigo-500">
                            <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
                        </svg>
                        <span>AI 知识库 Pro</span>
                    </Link>
                </div>
                <div className="flex-1 overflow-auto py-2">
                    <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
                        <Link href="/dashboard" className="flex items-center gap-3 rounded-lg bg-muted px-3 py-2 text-primary transition-all hover:text-primary">
                            <span className="text-lg">🏡</span> 首页
                        </Link>
                        <Link href="#" className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary">
                            <span className="text-lg">📝</span> 所有笔记
                        </Link>
                        <Link href="#" className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary">
                            <span className="text-lg">✨</span> 知识图谱
                        </Link>
                        <Link href="#" className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary">
                            <span className="text-lg">🗑️</span> 回收站
                        </Link>
                    </nav>

                    <div className="mt-6 px-4">
                        <h3 className="mb-2 text-xs font-semibold uppercase tracking-tight text-muted-foreground">分类标签</h3>
                        <div className="space-y-1">
                            <span className="block cursor-pointer rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-muted"># 计算机视觉</span>
                            <span className="block cursor-pointer rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-muted"># 前端工程化</span>
                            <span className="block cursor-pointer rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-muted"># 论文阅读</span>
                        </div>
                    </div>
                </div>
                <div className="mt-auto border-t p-4">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-600 font-bold">
                            U
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-medium">开发者</span>
                            <span className="text-xs text-muted-foreground">Free Plan</span>
                        </div>
                    </div>
                </div>
            </aside>

            {/* 右侧主内容区 */}
            <div className="flex flex-col flex-1">

                {/* 2. 顶部导航 (Header) */}
                <header className="flex h-14 items-center gap-4 border-b bg-muted/10 px-4 lg:h-[60px] lg:px-6">
                    <div className="w-full flex-1">
                        <form>
                            <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground">
                                    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                                </svg>
                                <Input
                                    type="search"
                                    placeholder="搜索笔记、代码片段或标签... (Ctrl+K)"
                                    className="w-full appearance-none bg-background pl-8 shadow-none md:w-2/3 lg:w-1/3"
                                />
                            </div>
                        </form>
                    </div>
                    <Button variant="outline" size="icon" className="h-8 w-8 rounded-full">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
                        <span className="sr-only">Toggle notifications</span>
                    </Button>
                </header>

                {/* 3. 主工作区 */}
                <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-8 lg:p-8 overflow-auto">

                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">欢迎回来 👋</h1>
                            <p className="text-sm text-muted-foreground mt-1">今天想记录点什么？或者让 AI 帮你整理思绪。</p>
                        </div>
                    </div>

                    {/* 快捷操作区 */}
                    <div className="grid gap-4 md:grid-cols-3">
                        <Card className="cursor-pointer transition-colors hover:border-indigo-500/50 hover:bg-indigo-500/5 group">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium group-hover:text-indigo-600">✨ AI 帮我写</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-xs text-muted-foreground">输入灵感片段，让 AI 生成结构化大纲或完整文章。</div>
                            </CardContent>
                        </Card>
                        <Card className="cursor-pointer transition-colors hover:border-primary/50 hover:bg-muted/50">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">📄 新建空白笔记</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-xs text-muted-foreground">打开 Markdown 编辑器，专注于纯粹的文字输入。</div>
                            </CardContent>
                        </Card>
                        <Card className="cursor-pointer transition-colors hover:border-primary/50 hover:bg-muted/50">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">📥 导入文档</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-xs text-muted-foreground">支持导入 Markdown、TXT 或从剪贴板直接生成笔记。</div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* 最近笔记网格 */}
                    <div className="mt-4">
                        <h2 className="text-lg font-semibold tracking-tight mb-4">最近编辑</h2>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            {recentNotes.map((note) => (
                                <Card key={note.id} className="flex flex-col cursor-pointer transition-all hover:shadow-md hover:border-primary/40">
                                    <CardHeader className="p-4 pb-2">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-secondary text-secondary-foreground">{note.tag}</span>
                                        </div>
                                        <CardTitle className="text-base line-clamp-1 leading-snug">{note.title}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-4 pt-0 flex-1 flex flex-col justify-between">
                                        <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                                            {note.excerpt}
                                        </p>
                                        <p className="text-xs text-muted-foreground font-medium">
                                            {note.date}
                                        </p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>

                </main>
            </div>
        </div>
    )
}