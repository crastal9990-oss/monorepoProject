"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
    Home,
    FileText,
    Network,
    Trash2,
    Hash,
    Command,
    User2,
} from "lucide-react"

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
} from "@repo/ui"

const navMain = [
    { title: "工作主页", url: "/dashboard", icon: Home },
    { title: "全部文档", url: "/notes", icon: FileText },
    { title: "知识图谱", url: "/graph", icon: Network },
    { title: "回收站", url: "/trash", icon: Trash2 },
]

const tags = ["计算机视觉", "Web开发", "论文阅读"]

export function AppSidebar() {
    const pathname = usePathname()

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
                                    <SidebarMenuButton asChild isActive={pathname.startsWith(item.url)} tooltip={item.title} className="transition-all duration-300">
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
