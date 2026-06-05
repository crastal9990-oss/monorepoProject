'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 提取纯文本的占位函数 (你需要根据你的编辑器格式实现)
function extractTextFromJson(content: any): string {
    if (!content) return '';
    if (typeof content === 'string') {
        // 去除 HTML 标签，替换 &nbsp;
        return content.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').trim();
    }
    return JSON.stringify(content);
}

// 简单的文本切块函数 (按固定字数切片，你可以换成更智能的按段落/换行符切片)
function chunkText(text: string, chunkSize: number = 500): string[] {
    const chunks = [];
    for (let i = 0; i < text.length; i += chunkSize) {
        chunks.push(text.slice(i, i + chunkSize));
    }
    return chunks;
}

export async function updateDocument(
    id: string,
    updates: { title?: string; content?: any; excerpt?: string },
    shouldUpdateEmbedding: boolean = false // ✨ 新增开关，默认不更新向量
) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: '未登录', status: 401 };

    try {
        const plainTextContent = extractTextFromJson(updates.content);

        // 1. 每次都高频更新主表（不花钱，且保证了常规的全文搜索立刻生效）
        const { error: docError } = await supabase
            .from('documents')
            .update({
                ...updates,
                plain_content: plainTextContent,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .eq('user_id', user.id);

        if (docError) throw new Error(`主表更新失败`);

        // 2. 只有当开关为 true 时，才去花钱做向量化
        if (shouldUpdateEmbedding) {
            // 删除旧向量
            await supabase.from('document_embeddings').delete().eq('document_id', id);

            // 切块
            const fullText = `${updates.title || ''}\n\n${plainTextContent}`;
            const chunks = chunkText(fullText, 500);

            if (chunks.length > 0) {
                const embeddingResponse = await openai.embeddings.create({
                    model: 'text-embedding-3-small',
                    input: chunks,
                });

                const embeddingsToInsert = embeddingResponse.data.map((item, index) => ({
                    document_id: id,
                    content: chunks[index],
                    embedding: item.embedding,
                    metadata: { chunk_index: index }
                }));

                const { error: insertError } = await supabase
                    .from('document_embeddings')
                    .insert(embeddingsToInsert);

                if (insertError) throw new Error(`向量更新失败`);
            }
        }

        revalidatePath('/notes');
        return { success: true, status: 200 };

    } catch (error: any) {
        console.error('更新文档或向量失败:', error);
        return { error: error.message, status: 500 };
    }
}