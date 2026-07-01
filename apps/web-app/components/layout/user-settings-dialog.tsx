"use client"

import * as React from "react"
import { useState, useEffect, useRef } from "react"
import { User2, Loader2, Camera, KeyRound, User, X } from "lucide-react"
import {
    Button,
    toast,
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    Input,
    Label,
    DialogClose
} from "@repo/ui"
import { createClient } from "@/utils/supabase/client"
import { useRouter } from "next/navigation"
import { updateUserProfile, updateUserPassword } from "@/actions/user"

interface UserSettingsDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    currentUser: any
    onUserUpdate: () => void
}

export function UserSettingsDialog({ open, onOpenChange, currentUser, onUserUpdate }: UserSettingsDialogProps) {
    const router = useRouter()
    const fileInputRef = useRef<HTMLInputElement>(null)

    // User metadata edit states
    const [nickname, setNickname] = useState("")
    const [avatarUrl, setAvatarUrl] = useState("")
    const [isSavingProfile, setIsSavingProfile] = useState(false)
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)

    // Password edit states
    const [newPassword, setNewPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [isSavingPassword, setIsSavingPassword] = useState(false)

    useEffect(() => {
        if (currentUser && open) {
            setNickname(currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || currentUser.email?.split('@')[0] || "")
            setAvatarUrl(currentUser.user_metadata?.avatar_url || "")
        }
    }, [currentUser, open])

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsUploadingAvatar(true)
        const supabase = createClient()

        try {
            const fileExt = file.name.split('.').pop()
            const fileName = `${currentUser.id}_${Date.now()}.${fileExt}`
            const filePath = `avatars/${fileName}`

            const { error: uploadError } = await supabase.storage
                .from('notes-images')
                .upload(filePath, file)

            if (uploadError) throw uploadError

            const { data: publicUrlData } = supabase.storage
                .from('notes-images')
                .getPublicUrl(filePath)

            const uploadedUrl = publicUrlData.publicUrl
            setAvatarUrl(uploadedUrl)
        } catch (error: any) {
            console.error(error)
            toast.error("上传头像失败: " + (error?.message || "未知错误"))
        } finally {
            setIsUploadingAvatar(false)
        }
    }

    const handleSaveProfile = async () => {
        if (!nickname.trim()) {
            toast.error("昵称不能为空")
            return
        }
        setIsSavingProfile(true)
        try {
            const res = await updateUserProfile(nickname, avatarUrl)
            if (res.success) {
                toast.success("个人信息保存成功")
                onUserUpdate()
                onOpenChange(false)
            } else {
                toast.error(res.error || "保存失败")
            }
        } catch (error: any) {
            toast.error("请求失败，请稍后重试")
        } finally {
            setIsSavingProfile(false)
        }
    }

    const handleSavePassword = async () => {
        if (!newPassword) {
            toast.error("新密码不能为空")
            return
        }
        if (newPassword !== confirmPassword) {
            toast.error("两次输入的新密码不一致")
            return
        }
        if (newPassword.length < 6) {
            toast.error("密码长度不能少于 6 位")
            return
        }

        setIsSavingPassword(true)
        try {
            const res = await updateUserPassword(newPassword)
            if (res.success) {
                toast.success("密码更新成功")
                setNewPassword("")
                setConfirmPassword("")
                onOpenChange(false)
            } else {
                toast.error(res.error || "密码更新失败")
            }
        } catch (error: any) {
            toast.error("操作失败，请重试")
        } finally {
            setIsSavingPassword(false)
        }
    }

    const isOAuthUser = currentUser?.app_metadata?.provider && currentUser.app_metadata.provider !== 'email'

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden rounded-xl border bg-background shadow-lg">
                {/* 吸顶的 Header */}
                <DialogHeader className="px-6 py-5 border-b bg-muted/30 sticky top-0 z-10 backdrop-blur-sm flex flex-row items-center justify-between">
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        个人设置
                    </DialogTitle>
                    <DialogClose className="rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 disabled:pointer-events-none cursor-pointer">
                        <X className="h-4.5 w-4.5" />
                        <span className="sr-only">Close</span>
                    </DialogClose>
                </DialogHeader>

                {/* 可滚动的单页内容区 */}
                <div className="max-h-[70vh] overflow-y-auto px-6 py-5 space-y-6 scrollbar-thin">
                    {/* ================= SECTION 1: 常规设置 ================= */}
                    <section className="space-y-2">
                        <div className="flex items-center justify-between pb-1.5 border-b border-border/60">
                            <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground/80">
                                <User className="w-4 h-4" />
                                常规设置
                            </h3>
                            <Button onClick={handleSaveProfile} disabled={isSavingProfile || isUploadingAvatar} size="sm" className="shadow-sm h-8">
                                {isSavingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                保存资料
                            </Button>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-6 items-start ml-1">
                            {/* 左侧：头像上传区 */}
                            <div className="flex flex-col items-center gap-2.5 shrink-0 sm:pt-0.5">
                                <div
                                    className="relative group cursor-pointer ring-offset-background transition-all hover:ring-2 hover:ring-primary/30 hover:ring-offset-2 rounded-full"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <div className="relative w-20 h-20 rounded-full overflow-hidden border bg-accent flex items-center justify-center shadow-sm">
                                        {isUploadingAvatar ? (
                                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                        ) : avatarUrl ? (
                                            <img src={avatarUrl} alt="Avatar Preview" className="w-full h-full object-cover" />
                                        ) : (
                                            <User2 className="h-8 w-8 text-muted-foreground" />
                                        )}
                                    </div>
                                    <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                        <Camera className="h-5 w-5 text-white" />
                                    </div>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleAvatarUpload}
                                        accept="image/*"
                                        className="hidden"
                                        disabled={isUploadingAvatar}
                                    />
                                </div>
                                <span className="text-[10px] text-muted-foreground font-medium">点击更换头像</span>
                            </div>

                            {/* 右侧：资料输入区 */}
                            <div className="flex-1 w-full space-y-3.5">
                                <div className="space-y-1.5">
                                    <Label htmlFor="nickname" className="text-xs font-semibold text-muted-foreground">昵称</Label>
                                    <Input
                                        id="nickname"
                                        placeholder="请输入您的昵称"
                                        value={nickname}
                                        onChange={(e) => setNickname(e.target.value)}
                                        className="h-9 transition-colors focus-visible:ring-primary/50"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <div className="flex items-baseline justify-between">
                                        <Label htmlFor="email-display" className="text-xs font-semibold text-muted-foreground">注册邮箱</Label>
                                        <span className="text-[10px] text-destructive font-normal">
                                            邮箱作为您的唯一登录凭证，暂时不支持修改。
                                        </span>
                                    </div>
                                    <Input
                                        id="email-display"
                                        value={currentUser?.email || ""}
                                        disabled
                                        className="h-9 bg-accent/40 cursor-not-allowed border-dashed text-muted-foreground"
                                    />
                                </div>
                            </div>
                        </div>
                    </section>
                    {/* ================= SECTION 2: 账号安全 ================= */}
                    <section className="space-y-4">
                        <div className="flex items-center justify-between pb-1.5 border-b border-border/60">
                            <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground/80">
                                <KeyRound className="h-4 w-4" />
                                账号安全
                            </h3>
                            {!isOAuthUser && (
                                <Button onClick={handleSavePassword} disabled={isSavingPassword} size="sm" className="h-8 shadow-sm">
                                    {isSavingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    更新密码
                                </Button>
                            )}
                        </div>

                        <div className="ml-1">
                            {isOAuthUser ? (
                                <div className="rounded-lg border border-border bg-accent/30 p-3.5 text-xs text-muted-foreground leading-relaxed flex items-start gap-2.5">
                                    <div>
                                        您当前是通过第三方账户 <strong className="text-foreground">{currentUser?.app_metadata?.provider?.toUpperCase()}</strong> 登录。密码由该服务商托管，无需在此处设置。
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3.5 rounded-lg border p-4 bg-card">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="new-password" className="text-xs font-semibold text-muted-foreground">新密码</Label>
                                            <Input
                                                id="new-password"
                                                type="password"
                                                placeholder="输入至少 6 位的新密码"
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                className="h-9"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="confirm-password" className="text-xs font-semibold text-muted-foreground">确认新密码</Label>
                                            <Input
                                                id="confirm-password"
                                                type="password"
                                                placeholder="请再次输入新密码"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                className="h-9"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </DialogContent>
        </Dialog>
    )
}