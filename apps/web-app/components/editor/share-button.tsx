"use client"

import { useState, useRef, useEffect } from 'react'
import { Share, Copy, Check, ShieldOff, Eye, Edit2, Loader2 } from 'lucide-react'
import { updateSharePermission } from '@/api/document'
import { toast } from '@repo/ui'

interface ShareButtonProps {
    documentId: string
    initialPermission: string
    shareToken: string
}

export default function ShareButton({ documentId, initialPermission, shareToken }: ShareButtonProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [permission, setPermission] = useState(initialPermission)
    const [updatingPerm, setUpdatingPerm] = useState<'none' | 'viewer' | 'editor' | null>(null)
    const [copied, setCopied] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    // 点击外部关闭下拉菜单
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside)
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isOpen])

    // 处理权限切换
    const handlePermissionChange = async (newPerm: 'none' | 'viewer' | 'editor') => {
        if (newPerm === permission) return
        setUpdatingPerm(newPerm)
        try {
            await updateSharePermission(documentId, newPerm)
            setPermission(newPerm)
            toast.success('分享权限已更新')
        } catch (error) {
            toast.error('更新失败，请重试')
        } finally {
            setUpdatingPerm(null)
        }
    }

    // 复制分享链接
    const handleCopyLink = () => {
        // 动态获取当前域名拼装分享链接
        const url = `${window.location.origin}/notes/${documentId}?token=${shareToken}`
        navigator.clipboard.writeText(url)
        setCopied(true)
        toast.success('链接已复制到剪贴板')
        setTimeout(() => setCopied(false), 2000)
    }

    // 映射权限对应的文案和图标
    const permConfig = {
        none: { label: '未开启分享', icon: <ShieldOff className="w-4 h-4" /> },
        viewer: { label: '获得链接的人可查看', icon: <Eye className="w-4 h-4" /> },
        editor: { label: '获得链接的人可编辑', icon: <Edit2 className="w-4 h-4" /> }
    }

    return (
        <div className="relative flex" ref={dropdownRef}>
            {/* 触发按钮 */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary hover:bg-primary/20 text-xs font-medium rounded-full transition-all active:scale-95"
            >
                <Share className="w-3.5 h-3.5" />
                分享
            </button>

            {/* 下拉面板 */}
            {isOpen && (
                <div className="absolute top-[calc(100%+8px)] left-0 w-80 bg-background border border-border shadow-xl rounded-2xl p-5 z-50 animate-in fade-in zoom-in-95 duration-200">
                    <div className="text-base font-semibold mb-4 tracking-tight">分享文档</div>

                    {/* 权限选择器 */}
                    <div className="flex flex-col gap-1 mb-4">
                        {(['none', 'viewer', 'editor'] as const).map((perm) => {
                            const isCurrentUpdating = updatingPerm === perm;
                            return (
                                <button
                                    key={perm}
                                    disabled={updatingPerm !== null}
                                    onClick={() => handlePermissionChange(perm)}
                                    className={`flex items-center justify-between px-3 py-2.5 text-sm rounded-lg transition-all ${permission === perm
                                        ? 'bg-primary/10 text-primary font-medium'
                                        : 'hover:bg-muted text-foreground'
                                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                    <div className="flex items-center gap-2">
                                        {isCurrentUpdating ? (
                                            <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                        ) : (
                                            permConfig[perm].icon
                                        )}
                                        {permConfig[perm].label}
                                    </div>
                                    {!isCurrentUpdating && permission === perm && <Check className="w-4 h-4" />}
                                </button>
                            );
                        })}
                    </div>

                    {/* 复制链接区域 (只有开启分享时才显示) */}
                    {permission !== 'none' && (
                        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
                            <input
                                readOnly
                                value={`${window.location.origin}/notes/${documentId.slice(0, 8)}...`}
                                className="flex-1 px-3 py-2 text-xs bg-muted/50 border border-border rounded-lg text-foreground outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                            />
                            <button
                                onClick={handleCopyLink}
                                className="flex items-center justify-center p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all active:scale-95 shadow-sm"
                            >
                                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}