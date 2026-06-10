import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { createClient } from '@/utils/supabase/server';
import OpenAI from 'openai';

export const maxDuration = 60; // 允许较长的执行时间给 RAG

const openaiClient = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL
});

const customAiSdkOpenAI = createOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL,
});

export async function POST(req: Request) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return new Response('Unauthorized', { status: 401 });
    }

    try {
        const payload = await req.json();
        console.log("================= API /api/chat PAYLOAD =================");
        const { messages, currentNoteId } = payload;

        // 兼容处理：将前端传来的 UIMessage (带 parts) 转换为大模型兼容的 CoreMessage (带 content)
        const coreMessages = (messages || []).map((msg: any) => {
            let content = msg.content || msg.text || '';
            if (!content && msg.parts && Array.isArray(msg.parts)) {
                content = msg.parts.map((p: any) => p.text || p.content || '').join('\n');
            }
            return { role: msg.role || 'user', content: content.trim() };
        });

        const latestMessage = coreMessages[coreMessages.length - 1]?.content;

        if (!latestMessage) {
            return new Response('Empty message', { status: 400 });
        }

        let contextText = '';
        let sources: Array<{ document_id: string; document_title: string; chunk_content: string }> = [];

        if (currentNoteId) {
            // ==========================================
            // 模式 A：【当前文档问答】
            // 直接读取最新纯文本，零延迟、零切块误差、零向量成本
            // ==========================================
            console.log('[DEBUG] 当前为文档范围搜索，直接提取最新纯文本...');
            const { data: doc, error: docError } = await supabase
                .from('documents')
                .select('title, plain_content')
                .eq('id', currentNoteId)
                .single();

            if (docError) {
                console.error('获取当前文档内容失败:', docError);
                throw new Error(`无法读取当前文档: ${docError.message}`);
            }

            if (doc?.plain_content) {
                contextText = `(当前文档: ${doc.title || '未命名'}):\n${doc.plain_content}`;
                sources = [{
                    document_id: currentNoteId,
                    document_title: doc.title || '未命名',
                    chunk_content: doc.plain_content
                }];
            }
            console.log('[DEBUG] 纯文本内容提取成功！');

        } else {
            // ==========================================
            // 模式 B：【全库知识库问答】(Workspace 范围)
            // 走标准的 RAG 向量检索流程
            // ==========================================
            console.log('[DEBUG] 当前为全局搜索，开始请求 embeddings API...');
            const embeddingResponse = await openaiClient.embeddings.create({
                model: 'text-embedding-v3',
                input: latestMessage,
                encoding_format: 'float',
                dimensions: 1024
            } as any);
            console.log('[DEBUG] embeddings API 请求成功!');

            const queryEmbedding = embeddingResponse.data[0].embedding;

            console.log('[DEBUG] 开始请求 Supabase RPC...');
            const { data: chunks, error } = await supabase.rpc('match_document_chunks', {
                query_embedding: `[${queryEmbedding.join(',')}]`,
                match_count: 5,
                filter_doc_id: null // 已经是全库搜索了
            });
            console.log('[DEBUG] Supabase RPC 请求完成!', chunks?.length, '个片段');

            if (error) {
                console.error('RAG 检索失败:', error);
                throw new Error(`向量检索失败: ${error.message}`);
            }

            if (chunks && chunks.length > 0) {
                contextText = chunks.map((chunk: any, index: number) =>
                    `[${index + 1}] (来源文档: ${chunk.document_title}):\n${chunk.chunk_content}`
                ).join('\n\n---\n\n');
                sources = chunks.map((c: any) => ({
                    document_id: c.document_id,
                    document_title: c.document_title,
                    chunk_content: c.chunk_content
                }));
            }
        }

        const systemPrompt = `你是一个强大的知识库 AI 助手。
                            请**只基于**下面提供的参考资料来回答用户的问题。
                            如果在参考资料中找到了答案，请在句子末尾严格使用 [索引] 标出引用来源，例如：[1] 或 [2]。
                            如果你在参考资料里找不到答案，请诚实地回答：“抱歉，我在当前提供的上下文中没有找到相关信息。”，**绝不能自己编造答案**。

                            【参考资料】:
                            ${contextText || "（暂无相关上下文数据）"}
                            `;

        // 4. 调用大模型并流式返回
        const result = await streamText({
            model: customAiSdkOpenAI('qwen-plus'), // 与你的 api/ai/route.ts 保持一致
            system: systemPrompt,
            messages: coreMessages,
            temperature: 0.3, // RAG 场景推荐较低温度，降低幻觉
        });

        return result.toUIMessageStreamResponse({
            messageMetadata: () => {
                return {
                    sources: sources
                };
            }
        });

    } catch (error) {
        console.error("Chat API 出错:", error);
        return new Response(JSON.stringify({ error: "AI 响应失败" }), { status: 500 });
    }
}
