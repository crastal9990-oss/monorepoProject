import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
// import { createClient } from '@/utils/supabase/server' // 引入你的 Supabase 客户端

// 允许该后台任务最长执行 60 秒
export const maxDuration = 60;

export async function POST(req: Request) {
    try {
        const { documentId, content } = await req.json();

        if (!documentId || !content || content.length < 50) {
            return new Response("内容过短，无需提取", { status: 200 });
        }

        // 1. 调用大模型生成极致精炼的摘要 (不使用流式)
        const { text } = await generateText({
            model: openai('qwen-plus'), // 继续使用阿里云百炼
            system: "你是一个专业的资深编辑。请仔细阅读用户提供的文档正文，提取出最核心的思想或结论，生成一段不超过 80 个字的极简摘要，用于首页信息流卡片展示。绝对不要包含任何解释性的话语（如“这段文字讲了...”）、Markdown 标记或标题，直接输出纯文本摘要。",
            prompt: content,
            temperature: 0.3, // 降低温度，保证摘要的稳定性和客观性
        });

        // 2. 将生成的摘要静默更新到数据库
        // const supabase = createClient();
        // const { error } = await supabase
        //   .from('documents')
        //   .update({ excerpt: text })
        //   .eq('id', documentId);

        // if (error) throw error;

        return new Response(JSON.stringify({ success: true, excerpt: text }), { status: 200 });

    } catch (error) {
        console.error("摘要提取失败:", error);
        // 静默失败，不抛出 500 惊动前端，因为这只是个增强功能
        return new Response(JSON.stringify({ error: "Background task failed" }), { status: 200 });
    }
}