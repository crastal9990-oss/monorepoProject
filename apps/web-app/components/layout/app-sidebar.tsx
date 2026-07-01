"use client"

import * as React from "react"
import { useState, useEffect, Suspense } from "react"
import Link from "next/link"
import { usePathname, useSearchParams, useRouter } from "next/navigation"
import { Home, FileText, Network, Trash2, Hash, Command, User2, Folder, Plus, Edit2, Loader2, ChevronRight, ChevronDown } from "lucide-react"
import {
    Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
    SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton,
    toast, AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@repo/ui"
import { getFolderList, createFolder, renameFolder, deleteFolder } from "@/actions/folder"
import { getDocumentList, renameDocument, deleteDocument } from "@/actions/document"
import { createClient } from "@/utils/supabase/client"
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@repo/ui"

const navMain = [
    { title: "工作主页", url: "/dashboard", icon: Home },
    { title: "全部文档", url: "/notes", icon: FileText },
    { title: "知识图谱", url: "/graph", icon: Network },
    { title: "回收站", url: "/trash", icon: Trash2 },
]

const tags = ["计算机视觉", "Web开发", "论文阅读"]

function DocIcon({ doc, className = "!size-3.5 shrink-0" }: { doc: any, className?: string }) {
    if (doc.is_pdf_raw) {
        return (
            <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="8" cy="14" r="2" stroke="currentColor" strokeWidth="2"/>
                <circle cx="16" cy="9" r="2" stroke="currentColor" strokeWidth="2"/>
                <circle cx="16" cy="18" r="2" stroke="currentColor" strokeWidth="2"/>
                <path d="M15 16L9 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M15 11L9 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
        )
    }
    if (doc.is_word_raw) {
        return (
            <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M8 12L10 18L12 14L14 18L16 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
        )
    }
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M8 13H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <path d="M8 17H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <path d="M8 9H10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
    )
}


function AppSidebarInner() {
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const router = useRouter()
    const currentFolderId = searchParams.get('folderId')

    const [folders, setFolders] = useState<any[]>([])
    const [isCreating, setIsCreating] = useState(false)
    const [newFolderName, setNewFolderName] = useState("")
    const [editingFolderId, setEditingFolderId] = useState<string | null>(null)
    const [editingName, setEditingName] = useState("")

    const [pendingCreateName, setPendingCreateName] = useState("")
    const [pendingRenameId, setPendingRenameId] = useState<string | null>(null)
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
    const [isLoadingFolders, setIsLoadingFolders] = useState(true)
    const [folderToDelete, setFolderToDelete] = useState<{ id: string; name: string } | null>(null)
    const [documents, setDocuments] = useState<any[]>([])
    const [isLoadingDocuments, setIsLoadingDocuments] = useState(true)
    const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({})

    const [editingDocId, setEditingDocId] = useState<string | null>(null)
    const [editingDocTitle, setEditingDocTitle] = useState("")
    const [docToDelete, setDocToDelete] = useState<{ id: string; title: string } | null>(null)
    const [pendingRenameDocId, setPendingRenameDocId] = useState<string | null>(null)
    const [pendingDeleteDocId, setPendingDeleteDocId] = useState<string | null>(null)

    const fetchDocuments = () => {
        getDocumentList().then((res) => {
            if (res.success && res.data) {
                setDocuments(res.data)
            }
            setIsLoadingDocuments(false)
        })
    }

    const toggleFolder = (e: React.MouseEvent, folderId: string) => {
        e.preventDefault()
        e.stopPropagation()
        setExpandedFolders(prev => ({
            ...prev,
            [folderId]: !prev[folderId]
        }))
    }

    const fetchFolders = () => {
        getFolderList().then((res) => {
            if (res.success && res.data) {
                setFolders(res.data)
            }
            setIsLoadingFolders(false)
        })
    }

    useEffect(() => {
        fetchFolders()
        fetchDocuments()

        const supabase = createClient()
        const folderChannel = supabase
            .channel('sidebar-folders-changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'folders' },
                () => { fetchFolders() }
            )
            .subscribe()

        const docChannel = supabase
            .channel('sidebar-documents-changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'documents' },
                () => { fetchDocuments() }
            )
            .subscribe()

        //全局实时事件同步：在笔记详情修改题目 侧边栏同步更新
        const handleFolderUpdate = (e: CustomEvent<{ id: string, name: string }>) => {
            setFolders(prev => prev.map(f => f.id === e.detail.id ? { ...f, name: e.detail.name } : f))
        }
        window.addEventListener('folder-updated', handleFolderUpdate as EventListener)

        const handleDocUpdate = (e: CustomEvent<{ id: string, title: string }>) => {
            setDocuments(prev => prev.map(doc =>
                doc.id === e.detail.id ? { ...doc, title: e.detail.title } : doc
            ))
        }
        window.addEventListener('document-updated', handleDocUpdate as EventListener)

        // 监听文档移动
        const handleDocMoved = (e: CustomEvent<{ id: string, folder_id: string | null }>) => {
            setDocuments(prev => prev.map(doc =>
                doc.id === e.detail.id ? { ...doc, folder_id: e.detail.folder_id } : doc
            ))
        }
        window.addEventListener('document-moved', handleDocMoved as EventListener)

        // 监听文档创建与删除
        const handleDocCreated = () => {
            fetchDocuments()
        }
        window.addEventListener('document-created', handleDocCreated as EventListener)

        const handleDocDeleted = (e: CustomEvent<{ id: string }>) => {
            setDocuments(prev => prev.filter(doc => doc.id !== e.detail.id))
        }
        window.addEventListener('document-deleted', handleDocDeleted as EventListener)

        return () => {
            supabase.removeChannel(folderChannel)
            supabase.removeChannel(docChannel)
            window.removeEventListener('folder-updated', handleFolderUpdate as EventListener)
            window.removeEventListener('document-updated', handleDocUpdate as EventListener)
            window.removeEventListener('document-moved', handleDocMoved as EventListener)
            window.removeEventListener('document-created', handleDocCreated as EventListener)
            window.removeEventListener('document-deleted', handleDocDeleted as EventListener)
        }
    }, [])

    const isSubmittingRef = React.useRef(false)

    const handleCreateFolder = async (name: string) => {
        const trimmedName = name.trim()
        if (!trimmedName) {
            setIsCreating(false)
            setNewFolderName("")
            return
        }

        if (isSubmittingRef.current) return
        isSubmittingRef.current = true

        setIsCreating(false)
        setNewFolderName("")
        setPendingCreateName(trimmedName)

        const res = await createFolder(trimmedName)
        if (res.success && res.data) {
            toast.success("文件夹创建成功")
            setFolders(prev => [res.data, ...prev])
        } else {
            toast.error(res.error || "创建失败")
        }

        setPendingCreateName("")
        isSubmittingRef.current = false
    }

    const handleRenameFolder = async (id: string, newName: string) => {
        const trimmedName = newName.trim()
        setEditingFolderId(null)
        setEditingName("")

        if (!trimmedName) return

        const folder = folders.find(f => f.id === id)
        if (folder && folder.name === trimmedName) return

        if (isSubmittingRef.current) return
        isSubmittingRef.current = true

        setPendingRenameId(id)
        setFolders(prev => prev.map(f => f.id === id ? { ...f, name: trimmedName } : f))

        const res = await renameFolder(id, trimmedName)
        if (res.success && res.data) {
            toast.success("重命名成功")
            setFolders(prev => prev.map(f => f.id === id ? res.data : f))
        } else {
            toast.error(res.error || "重命名失败")
            // Revert optimistic update
            fetchFolders()
        }

        setPendingRenameId(null)
        isSubmittingRef.current = false
    }

    const handleDeleteFolderClick = (e: React.MouseEvent, id: string, name: string) => {
        e.preventDefault()
        e.stopPropagation()
        setFolderToDelete({ id, name })
    }

    const confirmDeleteFolder = async () => {
        if (!folderToDelete) return

        const id = folderToDelete.id
        setPendingDeleteId(id)
        setFolderToDelete(null)

        const res = await deleteFolder(id)
        if (res.success) {
            toast.success("文件夹已删除")
            setFolders(prev => prev.filter(f => f.id !== id))
            if (currentFolderId === id) {
                router.push("/notes")
            }
        } else {
            toast.error(res.error || "删除失败")
        }
        setPendingDeleteId(null)
    }

    const handleRenameDoc = async (id: string, newTitle: string) => {
        const trimmedTitle = newTitle.trim()
        setEditingDocId(null)
        setEditingDocTitle("")

        if (!trimmedTitle) return
        const doc = documents.find(d => d.id === id)
        if (doc && doc.title === trimmedTitle) return

        if (isSubmittingRef.current) return
        isSubmittingRef.current = true
        setPendingRenameDocId(id)

        // Optimistic update
        setDocuments(prev => prev.map(d => d.id === id ? { ...d, title: trimmedTitle } : d))

        const res = await renameDocument(id, trimmedTitle)
        if (res.success) {
            toast.success("重命名成功")
        } else {
            toast.error(res.error || "重命名失败")
            fetchDocuments()
        }
        setPendingRenameDocId(null)
        isSubmittingRef.current = false
    }

    const handleDeleteDocClick = (e: React.MouseEvent, id: string, title: string) => {
        e.preventDefault()
        e.stopPropagation()
        setDocToDelete({ id, title })
    }

    const confirmDeleteDoc = async () => {
        if (!docToDelete) return
        const id = docToDelete.id
        setPendingDeleteDocId(id)
        setDocToDelete(null)

        const res = await deleteDocument(id)
        if (res.success) {
            toast.success("文档已删除")
            setDocuments(prev => prev.filter(d => d.id !== id))
            window.dispatchEvent(new CustomEvent('document-deleted', { detail: { id } }))
            if (pathname === `/notes/${id}`) {
                router.push("/notes")
            }
        } else {
            toast.error(res.error || "删除失败")
        }
        setPendingDeleteDocId(null)
    }

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
                            {navMain.map((item) => {
                                // 只有当没有 folderId 参数时，并且完全处于 /notes 根路由时，才高亮全部文档
                                const isAllDocsActive = item.url === "/notes" && pathname === "/notes" && !currentFolderId
                                const isActive = item.url === "/notes" ? isAllDocsActive : (pathname === item.url || pathname.startsWith(`${item.url}/`))
                                return (
                                    <SidebarMenuItem key={item.title}>
                                        <SidebarMenuButton asChild isActive={isActive} tooltip={item.title} className={`transition-all duration-300 
                                        ${isActive ? "bg-accent text-accent-foreground font-semibold shadow-sm" // 选中时的状态：背景加深、文字变色加粗
                                                : "text-muted-foreground hover:bg-muted hover:text-foreground" // 未选中时的悬浮状态
                                            }`}>
                                            <Link href={item.url}>
                                                <item.icon className="size-4" />
                                                <span className="font-medium text-sm tracking-wide">{item.title}</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                )
                            })}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                <SidebarGroup>
                    <SidebarGroupLabel className="flex items-center justify-between w-full group/label pr-2">
                        <span className="text-xs text-muted-foreground">我的文件夹</span>
                        <button
                            onClick={() => setIsCreating(true)}
                            className=" group-hover/label:opacity-100 p-0.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-all"
                            title="新建文件夹"
                        >
                            <Plus className="size-3.5" />
                        </button>
                    </SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {isCreating && (
                                <SidebarMenuItem>
                                    <div className="flex items-center gap-2 px-2 py-1 w-full">
                                        <Folder className="size-3.5 text-muted-foreground shrink-0" />
                                        <input
                                            autoFocus
                                            type="text"
                                            value={newFolderName}
                                            onChange={(e) => setNewFolderName(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault()
                                                    handleCreateFolder(newFolderName)
                                                }
                                                if (e.key === 'Escape') {
                                                    e.preventDefault()
                                                    setIsCreating(false)
                                                    setNewFolderName("")
                                                }
                                            }}
                                            onBlur={(e) => {
                                                handleCreateFolder(e.target.value)
                                            }}
                                            placeholder="输入文件夹名称"
                                            className="bg-transparent border-none outline-none text-[13px] w-full p-0 text-foreground placeholder:text-muted-foreground/50 focus:ring-0"
                                        />
                                    </div>
                                </SidebarMenuItem>
                            )}

                            {pendingCreateName && (
                                <SidebarMenuItem>
                                    <SidebarMenuButton className="opacity-50 cursor-not-allowed">
                                        <Loader2 className="size-3.5 text-muted-foreground animate-spin shrink-0" />
                                        <span className="text-[13px] font-medium tracking-wide truncate">{pendingCreateName}</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            )}

                            {isLoadingFolders || isLoadingDocuments ? (
                                <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground/60">
                                    <Loader2 className="size-3.5 animate-spin" />
                                    <span>加载中...</span>
                                </div>
                            ) : folders.length === 0 && documents.filter(doc => !doc.folder_id).length === 0 && !isCreating && !pendingCreateName ? (
                                <div className="text-xs text-muted-foreground/60 px-3 py-2">暂无内容</div>
                            ) : (
                                <>
                                    {folders.map((folder) => {
                                        const isFolderActive = pathname === "/notes" && currentFolderId === folder.id
                                        const isEditing = editingFolderId === folder.id

                                        return (
                                            <SidebarMenuItem key={folder.id} className="group/item">
                                                <div className="relative group/folder-header w-full flex items-center rounded-md">
                                                    {isEditing ? (
                                                        <div className="flex items-center gap-2 px-2 py-1.5 w-full bg-accent/50 rounded-md">
                                                            <Folder className="size-3.5 text-muted-foreground shrink-0" />
                                                            <input
                                                                autoFocus
                                                                type="text"
                                                                value={editingName}
                                                                onChange={(e) => setEditingName(e.target.value)}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') {
                                                                        e.preventDefault()
                                                                        handleRenameFolder(folder.id, editingName)
                                                                    }
                                                                    if (e.key === 'Escape') {
                                                                        e.preventDefault()
                                                                        setEditingFolderId(null)
                                                                        setEditingName("")
                                                                    }
                                                                }}
                                                                onBlur={(e) => handleRenameFolder(folder.id, e.target.value)}
                                                                className="bg-transparent border-none outline-none text-[13px] w-full p-0 text-foreground focus:ring-0"
                                                            />
                                                        </div>
                                                    ) : (
                                                        <SidebarMenuButton
                                                            asChild
                                                            isActive={isFolderActive}
                                                            className={`transition-all duration-300 pr-12 ${isFolderActive
                                                                ? "bg-accent text-accent-foreground font-semibold shadow-sm"
                                                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                                                } ${(pendingRenameId === folder.id || pendingDeleteId === folder.id) ? "opacity-50 pointer-events-none" : ""}`}
                                                        >
                                                            <div className="flex items-center w-full">
                                                                <button onClick={(e) => toggleFolder(e, folder.id)} className="p-0.5 -ml-1 mr-1 hover:bg-muted-foreground/20 rounded cursor-pointer z-10 shrink-0">
                                                                    {expandedFolders[folder.id] ? <ChevronDown className="size-3.5 shrink-0" /> : <ChevronRight className="size-3.5 shrink-0" />}
                                                                </button>
                                                                <Link href={`/notes?folderId=${folder.id}`} className="flex items-center gap-2 flex-1 min-w-0">
                                                                    {(pendingRenameId === folder.id || pendingDeleteId === folder.id) ? (
                                                                        <Loader2 className="size-3.5 text-muted-foreground animate-spin shrink-0" />
                                                                    ) : (
                                                                        <Folder className="size-3.5 text-muted-foreground shrink-0" />
                                                                    )}
                                                                    <span className="text-[13px] font-medium tracking-wide truncate">{folder.name}</span>
                                                                </Link>
                                                            </div>
                                                        </SidebarMenuButton>
                                                    )}

                                                    {!isEditing && (
                                                        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center opacity-0 group-hover/folder-header:opacity-100 transition-opacity pl-1 gap-0.5">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.preventDefault()
                                                                    e.stopPropagation()
                                                                    setEditingFolderId(folder.id)
                                                                    setEditingName(folder.name)
                                                                }}
                                                                className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded transition-colors"
                                                                title="重命名"
                                                            >
                                                                <Edit2 className="size-3.5" />
                                                            </button>
                                                            <button
                                                                onClick={(e) => handleDeleteFolderClick(e, folder.id, folder.name)}
                                                                className="p-1 hover:bg-muted text-muted-foreground hover:text-destructive rounded transition-colors"
                                                                title="删除"
                                                            >
                                                                <Trash2 className="size-3.5" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>

                                                {expandedFolders[folder.id] && (
                                                    <SidebarMenuSub>
                                                        {documents.filter(doc => doc.folder_id === folder.id).length === 0 ? (
                                                            <div className="px-4 py-2 text-xs text-muted-foreground/50">无文档</div>
                                                        ) : (
                                                            documents.filter(doc => doc.folder_id === folder.id).map(doc => {
                                                                const isDocActive = pathname === `/notes/${doc.id}`
                                                                const isDocEditing = editingDocId === doc.id
                                                                return (
                                                                    <SidebarMenuSubItem key={doc.id}>
                                                                        <div className="relative group/doc-header w-full flex items-center rounded-md">
                                                                            {isDocEditing ? (
                                                                                <div className="flex items-center gap-2 px-2 py-1.5 w-full pl-6 bg-accent/50 rounded-md">
                                                                                    <DocIcon doc={doc} className="!size-3.5 text-muted-foreground shrink-0" />
                                                                                    <input
                                                                                        autoFocus
                                                                                        type="text"
                                                                                        value={editingDocTitle}
                                                                                        onChange={(e) => setEditingDocTitle(e.target.value)}
                                                                                        onKeyDown={(e) => {
                                                                                            if (e.key === 'Enter') {
                                                                                                e.preventDefault()
                                                                                                handleRenameDoc(doc.id, editingDocTitle)
                                                                                            }
                                                                                            if (e.key === 'Escape') {
                                                                                                e.preventDefault()
                                                                                                setEditingDocId(null)
                                                                                                setEditingDocTitle("")
                                                                                            }
                                                                                        }}
                                                                                        onBlur={(e) => handleRenameDoc(doc.id, e.target.value)}
                                                                                        className="bg-transparent border-none outline-none text-xs w-full p-0 text-foreground focus:ring-0"
                                                                                    />
                                                                                </div>
                                                                            ) : (
                                                                                <TooltipProvider>
                                                                                    <Tooltip>
                                                                                        <TooltipTrigger asChild>
                                                                                            <SidebarMenuSubButton
                                                                                                asChild
                                                                                                isActive={isDocActive}
                                                                                                className={`transition-all duration-300 pr-12 ${isDocActive
                                                                                                    ? "bg-accent text-accent-foreground font-semibold shadow-sm"
                                                                                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                                                                                    } ${(pendingRenameDocId === doc.id || pendingDeleteDocId === doc.id) ? "opacity-50 pointer-events-none" : ""}`}
                                                                                            >
                                                                                                <Link href={`/notes/${doc.id}`} className="flex items-center gap-2 w-full">
                                                                                                    {(pendingRenameDocId === doc.id || pendingDeleteDocId === doc.id) ? (
                                                                                                        <Loader2 className="size-3.5 text-muted-foreground animate-spin shrink-0" />
                                                                                                    ) : (
                                                                                                        <DocIcon doc={doc} className="!size-3.5 text-muted-foreground shrink-0" />
                                                                                                    )}
                                                                                                    <span className="text-xs font-medium tracking-wide truncate">{doc.title || "无标题"}</span>
                                                                                                </Link>
                                                                                            </SidebarMenuSubButton>
                                                                                        </TooltipTrigger>
                                                                                        <TooltipContent side="bottom">
                                                                                            {doc.title || "无标题"}
                                                                                        </TooltipContent>
                                                                                    </Tooltip>
                                                                                </TooltipProvider>
                                                                            )}

                                                                            {!isDocEditing && (
                                                                                <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center opacity-0 group-hover/doc-header:opacity-100 transition-opacity pl-1 gap-0.5">
                                                                                    <button
                                                                                        onClick={(e) => {
                                                                                            e.preventDefault()
                                                                                            e.stopPropagation()
                                                                                            setEditingDocId(doc.id)
                                                                                            setEditingDocTitle(doc.title || "")
                                                                                        }}
                                                                                        className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded transition-colors"
                                                                                        title="重命名"
                                                                                    >
                                                                                        <Edit2 className="size-3.5" />
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={(e) => handleDeleteDocClick(e, doc.id, doc.title || "无标题")}
                                                                                        className="p-1 hover:bg-muted text-muted-foreground hover:text-destructive rounded transition-colors"
                                                                                        title="删除"
                                                                                    >
                                                                                        <Trash2 className="size-3.5" />
                                                                                    </button>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </SidebarMenuSubItem>
                                                                )
                                                            })
                                                        )}
                                                    </SidebarMenuSub>
                                                )}
                                            </SidebarMenuItem>
                                        )
                                    })}
                                    {/* 根目录下的文档 */}
                                    {documents.filter(doc => !doc.folder_id).map((doc) => {
                                        const isDocActive = pathname === `/notes/${doc.id}`
                                        const isDocEditing = editingDocId === doc.id
                                        return (
                                            <SidebarMenuItem key={doc.id} className="group/item">
                                                <div className="relative group/doc-header w-full flex items-center rounded-md">
                                                    {isDocEditing ? (
                                                        <div className="flex items-center gap-2 px-2 py-1.5 w-full bg-accent/50 rounded-md">
                                                            <div className="size-3.5 p-0.5 -ml-1 mr-1 shrink-0" />
                                                            <DocIcon doc={doc} className="!size-3.5 text-muted-foreground shrink-0" />
                                                            <input
                                                                autoFocus
                                                                type="text"
                                                                value={editingDocTitle}
                                                                onChange={(e) => setEditingDocTitle(e.target.value)}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') {
                                                                        e.preventDefault()
                                                                        handleRenameDoc(doc.id, editingDocTitle)
                                                                    }
                                                                    if (e.key === 'Escape') {
                                                                        e.preventDefault()
                                                                        setEditingDocId(null)
                                                                        setEditingDocTitle("")
                                                                    }
                                                                }}
                                                                onBlur={(e) => handleRenameDoc(doc.id, e.target.value)}
                                                                className="bg-transparent border-none outline-none text-[13px] w-full p-0 text-foreground focus:ring-0"
                                                            />
                                                        </div>
                                                    ) : (
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <SidebarMenuButton
                                                                        asChild
                                                                        isActive={isDocActive}
                                                                        className={`transition-all duration-300 pr-12 ${isDocActive
                                                                            ? "bg-accent text-accent-foreground font-semibold shadow-sm"
                                                                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                                                            } ${(pendingRenameDocId === doc.id || pendingDeleteDocId === doc.id) ? "opacity-50 pointer-events-none" : ""}`}
                                                                    >
                                                                        <div className="flex items-center w-full">
                                                                            <div className="size-3.5 p-0.5 -ml-1 mr-1 shrink-0" />
                                                                            <Link href={`/notes/${doc.id}`} className="flex items-center gap-2 flex-1 min-w-0">
                                                                                {(pendingRenameDocId === doc.id || pendingDeleteDocId === doc.id) ? (
                                                                                    <Loader2 className="size-3.5 text-muted-foreground animate-spin shrink-0" />
                                                                                ) : (
                                                                                    <DocIcon doc={doc} className="!size-3.5 text-muted-foreground shrink-0" />
                                                                                )}
                                                                                <span className="text-[13px] font-medium tracking-wide truncate">{doc.title || "无标题"}</span>
                                                                            </Link>
                                                                        </div>
                                                                    </SidebarMenuButton>
                                                                </TooltipTrigger>
                                                                <TooltipContent side="bottom">
                                                                    {doc.title || "无标题"}
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    )}

                                                    {!isDocEditing && (
                                                        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center opacity-0 group-hover/doc-header:opacity-100 transition-opacity pl-1 gap-0.5">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.preventDefault()
                                                                    e.stopPropagation()
                                                                    setEditingDocId(doc.id)
                                                                    setEditingDocTitle(doc.title || "")
                                                                }}
                                                                className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded transition-colors"
                                                                title="重命名"
                                                            >
                                                                <Edit2 className="size-3.5" />
                                                            </button>
                                                            <button
                                                                onClick={(e) => handleDeleteDocClick(e, doc.id, doc.title || "无标题")}
                                                                className="p-1 hover:bg-muted text-muted-foreground hover:text-destructive rounded transition-colors"
                                                                title="删除"
                                                            >
                                                                <Trash2 className="size-3.5" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </SidebarMenuItem>
                                        )
                                    })}
                                </>
                            )}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                {/* <SidebarGroup>
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
                </SidebarGroup> */}
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

            <AlertDialog open={!!folderToDelete} onOpenChange={(open) => { if (!open) setFolderToDelete(null) }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>是否删除文件夹：{folderToDelete?.name}？</AlertDialogTitle>
                        <AlertDialogDescription>
                            删除文件夹内的文档将移入根目录，不会被删除。此操作无法撤销。
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setFolderToDelete(null)}>取消</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDeleteFolder}>
                            删除
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={!!docToDelete} onOpenChange={(open) => { if (!open) setDocToDelete(null) }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>是否删除文档：{docToDelete?.title}？</AlertDialogTitle>
                        <AlertDialogDescription>
                            删除的内容将进入回收站，30 天后自动彻底删除。
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDocToDelete(null)}>取消</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDeleteDoc}>
                            删除
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Sidebar>
    )
}

export function AppSidebar() {
    return (
        <Suspense fallback={
            <Sidebar variant="inset">
                <div className="flex items-center justify-center h-full text-xs text-muted-foreground/60">加载中...</div>
            </Sidebar>
        }>
            <AppSidebarInner />
        </Suspense>
    )
}
