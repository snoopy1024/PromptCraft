import { useCallback, useEffect, useRef } from 'react';
import { useStore, type Conversation, type MessageError, type MessageStats } from '~/store';
import { estimateTokens, outputCostCny, promptCostCny, ratePerSecond } from '~/utils/messageStats';

interface ChatUsage {
  completion_tokens?: number;
  prompt_tokens?: number;
  prompt_cache_hit_tokens?: number;
  prompt_cache_miss_tokens?: number;
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
    setStreamingError,
    setStreamingStats,
    resetStream,
    saveConversation,
  } = useStore();
  const activeConversationIdRef = useRef<string | null>(null);

  const persistConversation = useCallback(
    async (conversation?: Conversation) => {
      try {
        await saveConversation(conversation);
      } catch (err) {
        console.error('Failed to save conversation:', err);
      }
    },
    [saveConversation],
  );

  useEffect(() => {
    if (
      abortRef.current &&
      activeConversationIdRef.current &&
      currentConversation?.id !== activeConversationIdRef.current
    ) {
      abortRef.current.abort();
    }
  }, [currentConversation?.id]);

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
      activeConversationIdRef.current = conversation.id;

      let fullContent = '';
      let fullReasoning = '';
      let fullError: MessageError | undefined;
      let finalUsage: ChatUsage | undefined;
      let requestParams: Record<string, unknown> | undefined;
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

        const promptTokens = finalUsage?.prompt_tokens;
        const promptCacheHit = finalUsage?.prompt_cache_hit_tokens;
        const promptCacheMiss = finalUsage?.prompt_cache_miss_tokens;

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
          promptTokens,
          promptCacheHitTokens: promptCacheHit,
          promptCacheMissTokens: promptCacheMiss,
          promptCostCny: promptTokens !== undefined
            ? promptCostCny(model, promptCacheHit ?? 0, promptCacheMiss ?? 0)
            : undefined,
          requestParams,
        };
      };

      const updateStreamingStats = () => {
        setStreamingStats(buildStats());
      };

      const isActiveConversation = () =>
        useStore.getState().currentConversation?.id === conversation.id &&
        abortRef.current === controller;

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
              if (!isActiveConversation()) {
                controller.abort();
                return;
              }

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
              } else if (parsed.type === 'request_params') {
                requestParams = parsed.params;
              } else if (parsed.type === 'usage') {
                finalUsage = parsed.usage;
                updateStreamingStats();
              } else if (parsed.type === 'error') {
                fullError = {
                  code: parsed.code,
                  title: parsed.title || '请求失败',
                  message: parsed.error || '模型服务没有返回可用错误信息。',
                };
                setStreamingError(fullError);
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
          fullError = {
            code: 'request_error',
            title: '请求失败',
            message: msg,
          };
          if (isActiveConversation()) {
            setStreamingError(fullError);
          }
        }
      } finally {
        const isActive = isActiveConversation();
        const shouldFinalize = Boolean(fullContent || fullReasoning || fullError);

        if (isActive) {
          const finalStats = buildStats(performance.now(), true);
          setStreamingStats(finalStats);
          if (shouldFinalize) {
            finalizeAssistantMessage(
              fullContent,
              fullReasoning || undefined,
              finalStats,
              fullError,
            );
          }
          setStreaming(false);
          resetStream();
          setTimeout(() => persistConversation(), 100);
        }

        if (abortRef.current === controller) {
          abortRef.current = null;
        }
        if (activeConversationIdRef.current === conversation.id) {
          activeConversationIdRef.current = null;
        }
      }
    },
    [
      resetStream,
      setStreaming,
      appendStreamContent,
      appendStreamReasoning,
      setStreamingError,
      setStreamingStats,
      finalizeAssistantMessage,
      persistConversation,
    ],
  );

  const send = useCallback(
    async (userContent: string) => {
      const state = useStore.getState();
      if (!state.currentConversation || state.isStreaming) return;

      state.addUserMessage(userContent);
      const nextConversation = useStore.getState().currentConversation;
      if (!nextConversation) return;

      void persistConversation(nextConversation);
      await runCompletion(nextConversation);
    },
    [persistConversation, runCompletion],
  );

  const retry = useCallback(
    async (assistantId: string) => {
      const state = useStore.getState();
      if (!state.currentConversation || state.isStreaming) return;

      const nextConversation = state.prepareAssistantRetry(assistantId);
      if (!nextConversation) return;

      void persistConversation(nextConversation);
      await runCompletion(nextConversation);
    },
    [persistConversation, runCompletion],
  );

  const editAndResend = useCallback(
    async (messageId: string, newContent: string) => {
      const state = useStore.getState();
      if (!state.currentConversation || state.isStreaming) return;

      const nextConversation = state.updateUserMessageAndTruncate(messageId, newContent);
      if (!nextConversation) return;

      void persistConversation(nextConversation);
      await runCompletion(nextConversation);
    },
    [persistConversation, runCompletion],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { send, retry, editAndResend, stop, isStreaming, currentConversation };
}
