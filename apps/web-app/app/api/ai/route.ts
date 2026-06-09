import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';

// 允许该接口最长执行 30 秒 (Next.js 默认 15 秒可能会超时)
export const maxDuration = 30;

export async function POST(req: Request) {
    try {
        const { prompt, action } = await req.json();

        // 1. 构建 System Prompt (系统提示词)
        // 这是让 AI 输出符合富文本要求的最关键一步：坚决不要让它输出 Markdown 标记或寒暄话语
        let systemPrompt = "你是一个专业的文档编辑助手。请直接输出处理后的纯文本结果，绝不要包含任何解释、寒暄、引号或 markdown 代码块标记。";

        if (action === 'improve') systemPrompt += "请润色以下文本，使其更通顺流畅、用词更精准。";
        if (action === 'expand') systemPrompt += "请基于以下文本进行合理的扩写，增加丰富的细节。";
        if (action === 'academic') systemPrompt += "请将以下文本转化为严谨的学术和专业报告口吻。";
        if (action === 'fix') systemPrompt += "请修复以下文本中的拼写错误和语法错误。";

        // 2. 调用大模型并开启流式输出
        const result = await streamText({
            model: openai('qwen-plus'), // 如果用了 DeepSeek，这里可以改成 openai('deepseek-chat')
            system: systemPrompt,
            prompt: prompt,
            temperature: 0.7,
        });

        // 🌟 架构亮点：使用 toTextStreamResponse() 而不是 DataStreamResponse()
        // 这会让底层直接返回纯文本数据流，前端不需要引入复杂的协议解析器，直接 TextDecoder 就能解！
        return result.toTextStreamResponse();

    } catch (error) {
        console.error("AI 接口出错:", error);
        return new Response(JSON.stringify({ error: "AI 生成失败" }), { status: 500 });
    }
}