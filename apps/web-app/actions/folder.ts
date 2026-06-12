"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

// 创建新文件夹
export async function createFolder(name: string, parentId?: string) {
    const supabase = createClient()

    // 获取当前登录用户
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (!user || authError) {
        return { error: '未登录或登录状态已过期', status: 401 }
    }

    const { data, error } = await supabase
        .from('folders')
        .insert([
            {
                user_id: user.id,
                name: name,
                parent_id: parentId || null
            }
        ])
        .select()
        .single()

    if (error) {
        console.error("创建文件夹失败:", error)
        return { error: '创建文件夹失败', status: 500 }
    }

    revalidatePath('/notes')
    return { success: true, data, status: 200 }
}

// 获取文件夹列表
export async function getFolderList() {
    const supabase = createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (!user || authError) {
        return { error: '未登录或登录状态已过期', status: 401 }
    }

    const { data, error } = await supabase
        .from('folders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

    if (error) {
        console.error("获取文件夹列表失败:", error)
        return { error: '获取文件夹列表失败', status: 500 }
    }
    return { success: true, data, status: 200 }
}

// 重命名文件夹
export async function renameFolder(id: string, name: string) {
    const supabase = createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (!user || authError) {
        return { error: '未登录或登录状态已过期', status: 401 }
    }

    const { data, error } = await supabase
        .from('folders')
        .update({ name, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single()

    if (error) {
        console.error("重命名文件夹失败:", error)
        return { error: '重命名文件夹失败', status: 500 }
    }

    revalidatePath('/notes')
    return { success: true, data, status: 200 }
}

// 删除文件夹
export async function deleteFolder(id: string) {
    const supabase = createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (!user || authError) {
        return { error: '未登录或登录状态已过期', status: 401 }
    }

    // 删除文件夹，对应的文档中的 folder_id 依赖 PostgreSQL 的 ON DELETE SET NULL 会自动被置空，防止文档丢失
    const { error } = await supabase
        .from('folders')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

    if (error) {
        console.error("删除文件夹失败:", error)
        return { error: '删除文件夹失败', status: 500 }
    }

    revalidatePath('/notes')
    return { success: true, status: 200 }
}
