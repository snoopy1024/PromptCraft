import { Router } from 'express';
import OpenAI from 'openai';

export const chatRouter = Router();

chatRouter.post('/', async (req, res) => {
  const { messages, model, systemPrompt, params, thinkingEnabled, thinkingLevel } = req.body as {
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    model: string;
    systemPrompt?: string;
    thinkingEnabled?: boolean;
    thinkingLevel?: 'off' | 'high' | 'max';
    params?: {
      temperature?: number;
      top_p?: number;
      max_tokens?: number;
      frequency_penalty?: number;
      presence_penalty?: number;
    };
  };

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'DEEPSEEK_API_KEY not set in .env' });
    return;
  }

  const client = new OpenAI({
    apiKey,
    baseURL: 'https://api.deepseek.com',
  });

  const fullMessages: OpenAI.ChatCompletionMessageParam[] = [];
  if (systemPrompt) {
    fullMessages.push({ role: 'system', content: systemPrompt });
  }
  fullMessages.push(...messages);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  const thinking = thinkingLevel ? thinkingLevel !== 'off' : thinkingEnabled !== false;

  try {
    const requestBody: Record<string, unknown> = {
      model,
      messages: fullMessages,
      stream: true,
      max_tokens: params?.max_tokens,
      stream_options: { include_usage: true },
      thinking: { type: thinking ? 'enabled' : 'disabled' },
    };

    // temperature/top_p/penalties are ignored in thinking mode per DeepSeek docs
    if (!thinking) {
      requestBody.temperature = params?.temperature;
      requestBody.top_p = params?.top_p;
    }

    const stream = await (client.chat.completions.create as Function)(requestBody);

    for await (const chunk of stream) {
      if (chunk.usage) {
        res.write(`data: ${JSON.stringify({ type: 'usage', usage: chunk.usage })}\n\n`);
      }

      const delta = chunk.choices?.[0]?.delta;
      if (!delta) continue;

      const reasoning = (delta as Record<string, unknown>).reasoning_content as string | undefined;
      if (reasoning) {
        res.write(`data: ${JSON.stringify({ type: 'reasoning', content: reasoning })}\n\n`);
      }

      if (delta.content) {
        res.write(`data: ${JSON.stringify({ type: 'content', content: delta.content })}\n\n`);
      }

    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Chat API error:', message);
    res.write(`data: ${JSON.stringify({ type: 'error', error: message })}\n\n`);
    res.end();
  }
});
