import { SupabaseClient } from '@supabase/supabase-js'
import { openai, createOpenAI } from '@ai-sdk/openai'
import { generateText, embedMany } from 'ai'

export function extractTextFromJson(node: any): string {
    if (!node) return ''
    if (node.type === 'text') return node.text || ''
    if (node.content && Array.isArray(node.content)) {
        const isBlock = ['paragraph', 'heading', 'listItem', 'blockquote', 'codeBlock'].includes(node.type)
        const text = node.content.map(extractTextFromJson).join('')
        return text + (isBlock ? '\n' : '')
    }
    return ''
}

export async function generateAITasksAndSave(
    documentId: string,
    plainText: string,
    supabase: SupabaseClient,
    tasks: { excerpt: boolean, embedding: boolean }
) {
    try {
        // 1. 获取文档的最新 title，用于配合正文生成摘要和向量
        const { data: doc } = await supabase.from('documents').select('title').eq('id', documentId).single()
        const title = doc?.title || '未命名'

        // ==========================================
        // 任务 A：生成极简摘要 (Excerpt)
        // ==========================================
        if (tasks.excerpt) {
            if (plainText.length < 50) {
                const defaultExcerpt = plainText.replace(/\n+/g, ' ').trim().substring(0, 80) || '无内容'
                await supabase.from('documents').update({ excerpt: defaultExcerpt }).eq('id', documentId)
            } else {
                const { text } = await generateText({
                    model: openai('qwen-plus'),
                    system: "你是一个专业的资深编辑。请仔细阅读用户提供的文档正文，提取出最核心的思想或结论，生成一段不超过 80 个字的极简摘要，用于首页信息流卡片展示。绝对不要包含任何解释性的话语（如“这段文字讲了...”）、Markdown 标记或标题，直接输出纯文本摘要。",
                    prompt: plainText,
                    temperature: 0.3,
                })
                console.log(`🤖 AI 成功为文档 [${documentId}] 生成摘要:`, text)
                await supabase.from('documents').update({ excerpt: text }).eq('id', documentId)
            }
        }

        // ==========================================
        // 任务 B：后台静默生成并更新向量库 (Embeddings)
        // 用于全局 Workspace 搜索和 RAG 问答
        // ==========================================
        if (tasks.embedding) {
            const fullText = `${title}\n\n${plainText}`

            // 简单的按长度切片 (500 字一块)
            const chunkSize = 500
            const chunks: string[] = []
            for (let i = 0; i < fullText.length; i += chunkSize) {
                chunks.push(fullText.slice(i, i + chunkSize))
            }

            if (chunks.length > 0) {
                console.log(`🧠 准备为文档 [${documentId}] 生成向量，共 ${chunks.length} 块...`)

                const customAiSdkOpenAI = createOpenAI({
                    apiKey: process.env.OPENAI_API_KEY,
                    baseURL: process.env.OPENAI_BASE_URL
                });

                const { embeddings } = await embedMany({
                    model: customAiSdkOpenAI.embedding('text-embedding-v3',),
                    values: chunks,
                });

                // 删除旧向量
                await supabase.from('document_embeddings').delete().eq('document_id', documentId);

                // 插入新向量
                const embeddingsToInsert = embeddings.map((embedding, index) => ({
                    document_id: documentId,
                    content: chunks[index],
                    embedding: `[${embedding.join(',')}]`,
                    metadata: { chunk_index: index }
                }));

                const { error: insertError } = await supabase
                    .from('document_embeddings')
                    .insert(embeddingsToInsert);

                if (insertError) {
                    throw new Error(`向量入库失败: ${insertError.message}`);
                }

                console.log(`✅ 文档 [${documentId}] 向量库更新成功！`);
            }
        }
    } catch (error) {
        console.error(`❌ AI 后台任务处理失败 [${documentId}]:`, error)
    }
}
