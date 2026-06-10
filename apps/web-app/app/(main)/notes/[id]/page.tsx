import { notFound } from "next/navigation"
import DocumentEditor from "@/components/editor/document-editor"
import { createClient as createServerClient } from '@/utils/supabase/server' // 你原本的服务端客户端
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { AiAssistantDrawer } from "@/components/layout/ai"

export default async function EditorPage({
    params,
    searchParams, // ✨ 1. 接收 URL 里的参数
}: {
    params: { id: string }
    searchParams: { token?: string }
}) {
    const supabase = createServerClient()

    // 1. 尝试以当前用户的身份正常查询（如果用户登录了，这里就能拿到数据）
    let { data: document } = await supabase
        .from('documents')
        .select('*')
        .eq('id', params.id)
        .single()

    // 2. 🚨 核心逻辑：如果正常没查到（可能是未登录被 RLS 拦截），但链接里带着 token
    if (!document && searchParams.token) {
        // 使用拥有最高权限的 Service Role 客户端（绕过 RLS）
        // 注意：因为这是 Server Component，这段代码在 Node.js 后台运行，密钥绝对安全
        const supabaseAdmin = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        // 用上帝视角去数据库里核对 token 是否匹配
        const { data: sharedDoc } = await supabaseAdmin
            .from('documents')
            .select('*')
            .eq('id', params.id)
            .eq('share_token', searchParams.token)
            .not('share_permission', 'eq', 'none') // 确保分享权限不是 none
            .single()

        // 如果 token 匹配，把查到的文档赋给 document
        if (sharedDoc) {
            document = sharedDoc
        }
    }

    // 3. 如果最后还是没有数据（token不匹配或瞎编的ID），才真正抛出 404
    if (!document) {
        notFound()
    }

    // 只需要把查到的真实数据，当作 props 喂给子组件即可！
    return (
        <div className="relative h-full">
            <DocumentEditor initialDocument={document} />
            <div className="fixed bottom-8 right-8 z-50">
                <AiAssistantDrawer />
            </div>
        </div>
    )
}