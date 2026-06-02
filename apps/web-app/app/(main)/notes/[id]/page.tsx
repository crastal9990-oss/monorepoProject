import { createClient } from "@/utils/supabase/server"
import { notFound } from "next/navigation"

// 接收动态路由传过来的参数 params.id
export default async function EditorPage({ params }: { params: { id: string } }) {
    const supabase = createClient()

    // 1. 根据 URL 里的 id，去数据库查询对应的文档数据
    const { data: document, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', params.id)
        .single() // 确保只返回一条数据

    // 2. 如果查不到这篇文档（或者没权限查），触发 Next.js 的 404 页面
    if (error || !document) {
        notFound()
    }

    // 3. 渲染编辑器的基础占位 UI
    return (
        <div className="flex flex-col h-full max-w-4xl mx-auto w-full p-6 lg:p-10">
            {/* 顶栏：显示状态和操作按钮 */}
            <div className="flex items-center justify-between mb-8 text-sm text-muted-foreground font-mono">
                <span>ID: {document.id.split('-')[0]}...</span>
                <span>已保存 (Supabase)</span>
            </div>

            {/* 标题输入区 */}
            <input
                type="text"
                defaultValue={document.title}
                placeholder="无标题文稿"
                className="text-4xl font-bold border-none outline-none bg-transparent mb-6 text-foreground placeholder:text-muted-foreground/50 focus:ring-0"
            />

            {/* 正文输入区 (目前是原生 textarea，后续替换为真正的 Markdown/富文本编辑器) */}
            <textarea
                defaultValue={document.content || ""}
                placeholder="开始输入正文，或者输入 '/' 唤起 AI 指令..."
                className="flex-1 w-full resize-none border-none outline-none bg-transparent text-[15px] leading-relaxed text-foreground placeholder:text-muted-foreground/50 focus:ring-0"
            />
        </div>
    )
}