"use client"

import * as React from "react"
import Link from "next/link"
import {
    Search,
    Bell,
    Home,
    FileText,
    Network,
    Trash2,
    Hash,
    Sparkles,
    FilePlus,
    Import,
    Command,
    User2,
    ArrowRight
} from "lucide-react"

import { Button, Input, Card, CardContent, CardHeader, CardTitle } from "@repo/ui"
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarProvider,
    SidebarTrigger,
    SidebarInset,
} from "@repo/ui"

// 模拟数据 (优化了时间与标签的中文表达)
const recentNotes = [
    { id: 1, title: "SAD-LMLIIF 模型架构与渲染推导", excerpt: "在处理任意尺度超分辨率时，利用频率感知特征编码可以有效减少伪影。需要重点优化 CMSR 模块的搜索循环逻辑...", date: "2 小时前", tag: "计算机视觉" },
    { id: 2, title: "Supabase RBAC 权限设计方案", excerpt: "结合 JWT token，在 PostgreSQL 的 RLS 中配置不同角色的表级别访问策略，确保租户数据隔离...", date: "昨天", tag: "后端架构" },
    { id: 3, title: "Next.js 首屏加载与 Tree-Shaking 优化", excerpt: "分析打出来的 bundle 大小，尽量将重型图表库采用 next/dynamic 进行懒加载，减少首屏阻塞时间...", date: "5月 12日", tag: "前端工程化" },
    { id: 4, title: "本周工作复盘与下周 Todo", excerpt: "1. 修复了批量处理脚本的问题，已改为单图可视化处理。 2. 准备搭建基础的协作文档平台...", date: "5月 10日", tag: "项目管理" }
]

const navMain = [
    { title: "工作主页", url: "/dashboard", icon: Home, isActive: true },
    { title: "全部文档", url: "#", icon: FileText },
    { title: "知识图谱", url: "#", icon: Network },
    { title: "回收站", url: "#", icon: Trash2 },
]

const tags = ["计算机视觉", "Web开发", "论文阅读"]

// --- 侧边栏 ---
function AppSidebar() {
    return (
        <Sidebar variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/">
                                <div className="flex aspect-square size-8 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm transition-shadow">
                                    <Command className="size-4" />
                                </div>
                                <div className="flex flex-col gap-0.5 leading-none">
                                    <span className="font-semibold tracking-tight text-[15px]">智记云 Pro</span>
                                    {/* 英文用全大写+宽间距保持科技感，不突兀 */}
                                    <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Workspace</span>
                                </div>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">功能导航</span>
                    </SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {navMain.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton asChild isActive={item.isActive} tooltip={item.title} className="transition-all duration-300">
                                        <Link href={item.url}>
                                            <item.icon className="size-4" />
                                            <span className="font-medium text-sm tracking-wide">{item.title}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                <SidebarGroup>
                    <SidebarGroupLabel className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">分类标签</span>
                    </SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {tags.map((tag) => (
                                <SidebarMenuItem key={tag}>
                                    <SidebarMenuButton asChild className="group transition-all duration-300">
                                        <Link href="#">
                                            <Hash className="size-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                                            <span className="text-[13px] font-medium tracking-wide">{tag}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>

            <SidebarFooter>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" className="transition-all duration-300 hover:bg-accent">
                            <div className="flex aspect-square size-8 items-center justify-center rounded-md border bg-background text-foreground">
                                <User2 className="size-4" />
                            </div>
                            <div className="flex flex-col gap-1 leading-none">
                                <span className="font-medium text-sm">开发者</span>
                                <span className="font-mono text-[10px] text-muted-foreground tracking-widest uppercase">Free Plan</span>
                            </div>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    )
}

// --- 页面主组件 ---
export default function DashboardPage() {
    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset>

                {/* 顶部导航 */}
                <header className="flex h-14 shrink-0 items-center gap-4 border-b bg-background/80 backdrop-blur-md px-4 lg:h-[60px] lg:px-8 z-50 sticky top-0">
                    <SidebarTrigger className="-ml-1 transition-transform hover:scale-105 duration-300" />

                    <div className="w-full flex-1">
                        <form>
                            <div className="relative group max-w-md">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors duration-300 group-focus-within:text-foreground" />
                                <Input
                                    type="search"
                                    placeholder="搜索标题、内容或标签..."
                                    className="w-full bg-muted/30 pl-9 shadow-sm border-border/50 focus-visible:bg-background focus-visible:ring-1 focus-visible:ring-foreground transition-all duration-300 rounded-md text-[13px] font-medium"
                                />
                            </div>
                        </form>
                    </div>

                    <Button variant="outline" size="icon" className="h-8 w-8 rounded-md transition-all duration-300 hover:shadow-md">
                        <Bell className="h-4 w-4" />
                    </Button>
                </header>

                {/* 主工作区 */}
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
                                <Card key={note.id} className="relative flex flex-col cursor-pointer border border-border/50 bg-background shadow-sm transition-all duration-500 ease-out hover:shadow-xl hover:-translate-y-1 hover:border-foreground/40 group overflow-hidden">

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
                            ))}
                        </div>
                    </div>

                </main>
            </SidebarInset>
        </SidebarProvider>
    )
}