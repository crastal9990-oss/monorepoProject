"use client"

import * as React from "react"
import { Bell } from "lucide-react"
import { Button, SidebarTrigger } from "@repo/ui"
import { SearchCommand } from "./search-command"

export function TopHeader() {
    return (
        <header className="flex h-14 shrink-0 items-center gap-4 border-b bg-background/80 backdrop-blur-md px-4 lg:h-[60px] lg:px-8 z-50 sticky top-0">
            <SidebarTrigger className="-ml-1 transition-transform hover:scale-105 duration-300" />

            <div className="w-full flex-1">
                <SearchCommand />
            </div>

            <Button variant="outline" size="icon" className="h-8 w-8 rounded-md transition-all duration-300 hover:shadow-md">
                <Bell className="h-4 w-4" />
            </Button>
        </header>
    )
}
