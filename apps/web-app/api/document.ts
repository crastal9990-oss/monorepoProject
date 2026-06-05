"use server"

import { createClient } from "@/utils/supabase/server" // 根据你的实际 supabase server 路径调整
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

// 新建笔记
export async function createNewDocument() {
    const supabase = createClient()

    // 获取当前登录用户
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (!user || authError) {
        return { error: '未登录或登录状态已过期', status: 401 }
    }
    // 在数据库中插入一条新空文稿
    const { data, error } = await supabase
        .from('documents')
        .insert([
            {
                user_id: user.id,
                title: '',
                excerpt: '开始你的记录...'
            }
        ])
        .select()
        .single()

    if (error) {
        return { error: '创建笔记失败' }
    }

    revalidatePath('/notes')
    return { success: true, id: data.id, status: 200 }
}

// 保存笔记  => '@/api/search'
// export async function updateDocument(
//     id: string,
//     updates: { title?: string; content?: string; excerpt?: string }
// ) {
//     const supabase = createClient()

//     const { data: { user } } = await supabase.auth.getUser()
//     if (!user) return { error: '未登录或登录状态已过期', status: 401 }

//     // 执行更新操作
//     const { error } = await supabase
//         .from('documents')
//         .update({
//             ...updates,
//             updated_at: new Date().toISOString()
//         })
//         .eq('id', id)
//         .eq('user_id', user.id) // 双重保险，确保只能改自己的

//     if (error) {
//         return { error: '保存失败', status: 500 }
//     }

//     revalidatePath('/notes')
//     return { success: true, status: 200 }
// }

// 获取笔记列表
export async function getDocumentList(limit?: number) {
    const supabase = createClient()
    let query = supabase
        .from('documents')
        .select('*')
        .eq('is_trashed', false)
        .order('updated_at', { ascending: false })

    if (limit) {
        query = query.limit(limit)
    }

    const { data, error } = await query

    if (error) {
        return { error: '获取笔记列表失败', status: 500 }
    }
    return { success: true, data, status: 200 }
}

// 获取回收站笔记列表
export async function getTrashedDocumentList() {
    const supabase = createClient()
    const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('is_trashed', true)
        .order('updated_at', { ascending: false })

    if (error) {
        return { error: '获取回收站列表失败', status: 500 }
    }
    return { success: true, data, status: 200 }
}

// 删除笔记
export async function deleteDocument(id: string) {
    const supabase = createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (!user || authError) {
        return { error: '未登录或登录状态已过期', status: 401 }
    }

    const { error } = await supabase
        .from('documents')
        .update({ is_trashed: true })
        .eq('id', id)
        .eq('user_id', user.id) // 确保只能删除自己的笔记

    if (error) {
        return { error: '删除笔记失败', status: 500 }
    }

    revalidatePath('/notes')
    revalidatePath('/trash')
    return { success: true, status: 200 }
}

// 上传图片
export async function uploadImage(formData: FormData): Promise<string | null> {
    const file = formData.get('file') as File
    if (!file) return null

    const supabase = createClient()

    // 生成一个唯一的文件名避免覆盖
    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`
    const filePath = `uploads/${fileName}`

    try {
        const { data, error } = await supabase.storage
            .from('notes-images') // 替换为你实际的 Bucket 名字
            .upload(filePath, file)

        if (error) throw error

        // 获取图片的公开访问链接
        const { data: publicUrlData } = supabase.storage
            .from('notes-images')
            .getPublicUrl(filePath)

        return publicUrlData.publicUrl
    } catch (error) {
        console.error('图片上传失败:', error)
        return null
    }
}