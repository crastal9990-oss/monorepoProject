'use server'

import { createClient as createServerClient } from '@/utils/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

// 创建一个拥有 Admin 权限的 Supabase 客户端，用来注销/删除 Auth 用户账户
function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

// 1. 更新用户基本资料 (Nickname / Avatar URL)
export async function updateUserProfile(nickname: string, avatarUrl?: string) {
  const supabase = createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (!user || authError) {
    return { error: '未登录或登录状态已过期', status: 401 }
  }

  const updates: any = {
    data: {
      ...user.user_metadata,
      full_name: nickname,
      name: nickname,
    }
  }

  if (avatarUrl) {
    updates.data.avatar_url = avatarUrl
  }

  const { error } = await supabase.auth.updateUser(updates)

  if (error) {
    return { error: '更新个人信息失败: ' + error.message, status: 500 }
  }

  return { success: true, status: 200 }
}

// 2. 更新密码 (必须输入旧密码并验证，然后再设新密码。如果是 OAuth 登录，则通常不支持)
export async function updateUserPassword(newPassword: string) {
  const supabase = createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (!user || authError) {
    return { error: '未登录或登录状态已过期', status: 401 }
  }

  // Supabase auth.updateUser 直接传入 password，如果是以当前 session 登录的话
  const { error } = await supabase.auth.updateUser({
    password: newPassword
  })

  if (error) {
    return { error: '密码更新失败: ' + error.message, status: 500 }
  }

  return { success: true, status: 200 }
}

// 3. 彻底注销账号 (Delete Account)：清除用户的所有文档、文件夹、对话消息，最后在 auth 表中删除用户
export async function deleteUserAccount() {
  const supabase = createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (!user || authError) {
    return { error: '未登录或登录状态已过期', status: 401 }
  }

  const userId = user.id

  try {
    // A. 先删除关联的向量嵌入 (document_embeddings)
    // 关联条件：document_embeddings.document_id 在该用户的 documents 内
    const { data: userDocs, error: fetchDocsError } = await supabase
      .from('documents')
      .select('id')
      .eq('user_id', userId)

    if (fetchDocsError) throw fetchDocsError

    if (userDocs && userDocs.length > 0) {
      const docIds = userDocs.map(d => d.id)
      const { error: delEmbedError } = await supabase
        .from('document_embeddings')
        .delete()
        .in('document_id', docIds)
      
      if (delEmbedError) throw delEmbedError
    }

    // B. 删除该用户的所有文档 (documents)
    const { error: delDocsError } = await supabase
      .from('documents')
      .delete()
      .eq('user_id', userId)
    if (delDocsError) throw delDocsError

    // C. 删除该用户的所有文件夹 (folders)
    const { error: delFoldersError } = await supabase
      .from('folders')
      .delete()
      .eq('user_id', userId)
    if (delFoldersError) throw delFoldersError

    // D. 删除该用户的所有聊天消息 (chat_messages)
    const { error: delChatsError } = await supabase
      .from('chat_messages')
      .delete()
      .eq('user_id', userId)
    if (delChatsError) throw delChatsError

    // E. 用 Admin 权限彻底从 Supabase Auth 系统中把这个 User 删掉
    const adminClient = createAdminClient()
    const { error: delUserError } = await adminClient.auth.admin.deleteUser(userId)
    if (delUserError) throw delUserError

    revalidatePath('/')
    return { success: true, status: 200 }
  } catch (error: any) {
    console.error('注销账号失败:', error)
    return { error: '注销账号失败: ' + (error?.message || '未知错误'), status: 500 }
  }
}
