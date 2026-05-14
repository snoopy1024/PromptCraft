import { useCallback, useRef } from 'react';
import { useStore, type Conversation, type MessageStats } from '~/store';
import { estimateTokens, outputCostCny, ratePerSecond } from '~/utils/messageStats';

interface ChatUsage {
  completion_tokens?: number;
  completion_tokens_details?: {
    reasoning_tokens?: number;
  };
}

export function useChat() {
  const abortRef = useRef<AbortController | null>(null);
  const {
    currentConversation,
    isStreaming,
    finalizeAssistantMessage,
    setStreaming,
    appendStreamContent,
    appendStreamReasoning,
    setStreamingStats,
    resetStream,
    saveConversation,
  } = useStore();

  const runCompletion = useCallback(
    async (conversation: Conversation) => {
      resetStream();
      setStreaming(true);

      const messages = conversation.messages.map((message) => ({
        role: message.role,
        content: message.content,
      }));

      const controller = new AbortController();
      abortRef.current = controller;

      let fullContent = '';
      let fullReasoning = '';
      let finalUsage: ChatUsage | undefined;
      const model = conversation.model;
      const requestStart = performance.now();
      let reasoningStartedAt: number | undefined;
      let reasoningEndedAt: number | undefined;
      let completionStartedAt: number | undefined;
      let completionEndedAt: number | undefined;

      const buildStats = (now = performance.now(), final = false): MessageStats => {
        const usageReasoningTokens =
          finalUsage?.completion_tokens_details?.reasoning_tokens;
        const reasoningTokens =
          usageReasoningTokens ?? estimateTokens(fullReasoning);
        const usageCompletionTokens = finalUsage?.completion_tokens;
        const completionTokens =
          usageCompletionTokens !== undefined
            ? Math.max(0, usageCompletionTokens - reasoningTokens)
            : estimateTokens(fullContent);

        const reasoningDurationMs = reasoningStartedAt
          ? Math.max(0, (final ? reasoningEndedAt ?? now : now) - reasoningStartedAt)
          : undefined;
        const completionDurationMs = completionStartedAt
          ? Math.max(0, (final ? completionEndedAt ?? now : now) - completionStartedAt)
          : fullContent
            ? Math.max(0, now - requestStart)
            : undefined;

        return {
          completionTokens,
          completionEstimated: !finalUsage,
          completionDurationMs,
          completionTokensPerSecond: ratePerSecond(completionTokens, completionDurationMs),
          completionCostCny: outputCostCny(model, completionTokens),
          reasoningTokens,
          reasoningEstimated: !finalUsage,
          reasoningDurationMs,
          reasoningTokensPerSecond: ratePerSecond(reasoningTokens, reasoningDurationMs),
          reasoningCostCny: outputCostCny(model, reasoningTokens),
        };
      };

      const updateStreamingStats = () => {
        setStreamingStats(buildStats());
      };

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages,
            model: conversation.model,
            systemPrompt: conversation.systemPrompt || undefined,
            thinkingLevel: conversation.thinkingLevel,
            params: conversation.params,
          }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          throw new Error(`Request failed: ${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6).trim();
            if (data === '[DONE]') break;

            try {
              const parsed = JSON.parse(data);
              if (parsed.type === 'content') {
                const now = performance.now();
                completionStartedAt ??= now;
                completionEndedAt = now;
                reasoningEndedAt ??= reasoningStartedAt ? now : undefined;
                fullContent += parsed.content;
                appendStreamContent(parsed.content);
                updateStreamingStats();
              } else if (parsed.type === 'reasoning') {
                const now = performance.now();
                reasoningStartedAt ??= now;
                reasoningEndedAt = now;
                fullReasoning += parsed.content;
                appendStreamReasoning(parsed.content);
                updateStreamingStats();
              } else if (parsed.type === 'usage') {
                finalUsage = parsed.usage;
                updateStreamingStats();
              } else if (parsed.type === 'error') {
                const now = performance.now();
                completionStartedAt ??= now;
                completionEndedAt = now;
                fullContent += `\n\n**Error:** ${parsed.error}`;
                appendStreamContent(`\n\n**Error:** ${parsed.error}`);
                updateStreamingStats();
              }
            } catch {
              // skip malformed JSON lines
            }
          }
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          // user cancelled
        } else {
          const msg = err instanceof Error ? err.message : 'Unknown error';
          fullContent += `\n\n**Error:** ${msg}`;
          appendStreamContent(`\n\n**Error:** ${msg}`);
        }
      } finally {
        const finalStats = buildStats(performance.now(), true);
        setStreamingStats(finalStats);
        finalizeAssistantMessage(fullContent, fullReasoning || undefined, finalStats);
        setStreaming(false);
        abortRef.current = null;
        setTimeout(() => saveConversation(), 100);
      }
    },
    [
      resetStream,
      setStreaming,
      appendStreamContent,
      appendStreamReasoning,
      setStreamingStats,
      finalizeAssistantMessage,
      saveConversation,
    ],
  );

  const send = useCallback(
    async (userContent: string) => {
      const state = useStore.getState();
      if (!state.currentConversation || state.isStreaming) return;

      state.addUserMessage(userContent);
      const nextConversation = useStore.getState().currentConversation;
      if (!nextConversation) return;

      await runCompletion(nextConversation);
    },
    [runCompletion],
  );

  const retry = useCallback(
    async (assistantId: string) => {
      const state = useStore.getState();
      if (!state.currentConversation || state.isStreaming) return;

      const nextConversation = state.prepareAssistantRetry(assistantId);
      if (!nextConversation) return;

      await runCompletion(nextConversation);
    },
    [runCompletion],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { send, retry, stop, isStreaming, currentConversation };
}
