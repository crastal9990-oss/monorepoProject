"use server"

import { createClient } from "@/utils/supabase/server" // 根据你的实际 supabase server 路径调整
import { redirect } from "next/navigation"

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
                title: '无标题文稿',
                excerpt: '开始你的记录...'
            }
        ])
        .select()
        .single()

    if (error) {
        return { error: '创建笔记失败' }
    }
    return { success: true, id: data.id }
}