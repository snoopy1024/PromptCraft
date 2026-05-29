import { Router } from 'express';
import OpenAI from 'openai';

export const chatRouter = Router();

const configuredFirstChunkTimeoutMs = Number(process.env.DEEPSEEK_FIRST_CHUNK_TIMEOUT_MS);
const FIRST_CHUNK_TIMEOUT_MS = Number.isFinite(configuredFirstChunkTimeoutMs)
  ? configuredFirstChunkTimeoutMs
  : 30000;

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
    };
  };

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    res.status(400).json({ error: '未配置 API 密钥。请在设置中添加 DeepSeek API Key。' });
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

  let responseClosed = false;
  const upstreamController = new AbortController();
  let firstChunkTimer: NodeJS.Timeout | undefined;

  const clearFirstChunkTimer = () => {
    if (firstChunkTimer) {
      clearTimeout(firstChunkTimer);
      firstChunkTimer = undefined;
    }
  };

  res.on('close', () => {
    responseClosed = true;
    clearFirstChunkTimer();
    upstreamController.abort();
  });

  try {
    const requestBody: Record<string, unknown> = {
      model,
      messages: fullMessages,
      stream: true,
      max_tokens: params?.max_tokens,
      stream_options: { include_usage: true },
      thinking: { type: thinking ? 'enabled' : 'disabled' },
      ...(thinking && thinkingLevel && thinkingLevel !== 'off' && {
        reasoning_effort: thinkingLevel,
      }),
    };

    // temperature/top_p/penalties are ignored in thinking mode per DeepSeek docs
    if (!thinking) {
      requestBody.temperature = params?.temperature;
      requestBody.top_p = params?.top_p;
    }

    const { messages: _msgs, stream: _s, stream_options: _so, ...visibleParams } = requestBody;
    res.write(`data: ${JSON.stringify({ type: 'request_params', params: visibleParams })}\n\n`);

    firstChunkTimer = setTimeout(() => {
      upstreamController.abort();
    }, FIRST_CHUNK_TIMEOUT_MS);

    const stream = await (client.chat.completions.create as Function)(requestBody, {
      signal: upstreamController.signal,
    });

    for await (const chunk of stream) {
      clearFirstChunkTimer();

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

    if (!responseClosed) {
      res.write('data: [DONE]\n\n');
    }
    res.end();
  } catch (err: unknown) {
    clearFirstChunkTimer();
    if (responseClosed) return;

    const message = err instanceof Error ? err.message : 'Unknown error';
    const timedOut = upstreamController.signal.aborted && !responseClosed;
    if (!timedOut) {
      console.error('Chat API error:', message);
    }

    res.write(`data: ${JSON.stringify({
      type: 'error',
      code: timedOut ? 'upstream_timeout' : 'upstream_error',
      title: timedOut ? '上游响应超时' : '请求失败',
      error: timedOut
        ? `DeepSeek ${model} 在 ${Math.max(1, Math.ceil(FIRST_CHUNK_TIMEOUT_MS / 1000))} 秒内没有返回首个数据块，请稍后重试或切换模型。`
        : message,
    })}\n\n`);
    res.end();
  }
});
