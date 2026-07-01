"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { User2, Settings, LogOut, ShieldAlert, Loader2 } from "lucide-react"
import {
    Button,
    SidebarTrigger,
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuItem,
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogCancel,
    AlertDialogAction,
    toast
} from "@repo/ui"
import { SearchCommand } from "./search-command"
import { createClient } from "@/utils/supabase/client"
import { useRouter } from "next/navigation"
import { UserSettingsDialog } from "./user-settings-dialog"
import { deleteUserAccount } from "@/actions/user"

export function TopHeader() {
    const [currentUser, setCurrentUser] = useState<any>(null)
    const [isSettingsOpen, setIsSettingsOpen] = useState(false)
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
    const [isDeletingAccount, setIsDeletingAccount] = useState(false)
    
    const router = useRouter()

    const fetchUser = async () => {
        const supabase = createClient()
        const { data } = await supabase.auth.getUser()
        if (data?.user) {
            setCurrentUser(data.user)
        }
    }

    useEffect(() => {
        fetchUser()

        const supabase = createClient()
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                setCurrentUser(session.user)
            } else {
                setCurrentUser(null)
            }
        })

        return () => subscription.unsubscribe()
    }, [])

    const handleLogout = async () => {
        const supabase = createClient()
        await supabase.auth.signOut()
        router.push('/login')
    }

    const handleDeleteAccount = async () => {
        setIsDeletingAccount(true)
        try {
            const res = await deleteUserAccount()
            if (res.success) {
                toast.success("账号已成功注销，正在退出...")
                const supabase = createClient()
                await supabase.auth.signOut()
                setIsDeleteConfirmOpen(false)
                router.push('/login')
            } else {
                toast.error(res.error || "注销账号失败")
            }
        } catch (error: any) {
            toast.error("操作失败，请重试")
        } finally {
            setIsDeletingAccount(false)
        }
    }

    return (
        <>
            <header className="flex h-14 shrink-0 items-center gap-4 border-b bg-background/80 backdrop-blur-md px-4 lg:h-[60px] lg:px-8 z-50 sticky top-0">
                <SidebarTrigger className="-ml-1 transition-transform hover:scale-105 duration-300" />

                <div className="w-full flex-1">
                    <SearchCommand />
                </div>

                <div className="flex items-center gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="relative h-8 w-8 rounded-full overflow-hidden border hover:shadow-md transition-all duration-300 p-0 cursor-pointer">
                                {currentUser?.user_metadata?.avatar_url ? (
                                    <img src={currentUser.user_metadata.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <User2 className="h-4 w-4 text-muted-foreground" />
                                )}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56" align="end">
                            <DropdownMenuLabel className="font-normal">
                                <div className="flex flex-col space-y-1">
                                    <div className="flex items-center gap-2 py-1.5">
                                        <div className="flex aspect-square size-8 items-center justify-center rounded-md border bg-background text-foreground overflow-hidden shrink-0">
                                            {currentUser?.user_metadata?.avatar_url ? (
                                                <img src={currentUser.user_metadata.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                            ) : (
                                                <User2 className="size-4" />
                                            )}
                                        </div>
                                        <div className="flex flex-col space-y-0.5 overflow-hidden flex-1">
                                            <p className="text-sm font-medium leading-none truncate">
                                                {currentUser?.user_metadata?.full_name || currentUser?.user_metadata?.name || currentUser?.email?.split('@')[0] || "开发者"}
                                            </p>
                                            <p className="text-xs leading-none text-muted-foreground truncate">
                                                {currentUser?.email || "未登录"}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={() => {
                                    setTimeout(() => {
                                        setIsSettingsOpen(true)
                                    }, 100)
                                }}
                                className="cursor-pointer"
                            >
                                <Settings className="mr-2 h-4 w-4" />
                                <span>个人设置</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={() => {
                                    setTimeout(() => {
                                        setIsDeleteConfirmOpen(true)
                                    }, 100)
                                }}
                                className="cursor-pointer"
                            >
                                <ShieldAlert className="mr-2 h-4 w-4" />
                                <span>注销账户</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                                <LogOut className="mr-2 h-4 w-4" />
                                <span>退出登录</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </header>

            {/* 个人设置弹窗组件 */}
            <UserSettingsDialog
                open={isSettingsOpen}
                onOpenChange={setIsSettingsOpen}
                currentUser={currentUser}
                onUserUpdate={fetchUser}
            />

            {/* 注销账号二次确认弹窗 */}
            <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-destructive flex items-center gap-2">
                            <ShieldAlert className="h-5 w-5 text-destructive" />
                            确认要注销此账户吗？
                        </AlertDialogTitle>
                        <AlertDialogDescription className="space-y-4 pt-2">
                            <p className="leading-relaxed">此操作将永久清空您所有的云端文档，无法撤销，请谨慎操作。</p>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="pt-4">
                        <AlertDialogCancel disabled={isDeletingAccount}>取消</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault()
                                handleDeleteAccount()
                            }}
                            disabled={isDeletingAccount}
                            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                        >
                            {isDeletingAccount ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    正在注销...
                                </>
                            ) : (
                                "确认永久注销"
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
