"use client"

import * as React from "react"
import { Search, Bell } from "lucide-react"
import { Button, Input, SidebarTrigger } from "@repo/ui"

export function TopHeader() {
    return (
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
    )
}
