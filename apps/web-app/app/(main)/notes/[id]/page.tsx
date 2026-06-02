import { createClient } from "@/utils/supabase/server"
import { notFound } from "next/navigation"
import DocumentEditor from "@/components/editor/document-editor"

export default async function EditorPage({ params }: { params: { id: string } }) {
    const supabase = createClient()

    const { data: document, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', params.id)
        .single()

    if (error || !document) {
        notFound()
    }

    // 只需要把查到的真实数据，当作 props 喂给子组件即可！
    return <DocumentEditor initialDocument={document} />
}