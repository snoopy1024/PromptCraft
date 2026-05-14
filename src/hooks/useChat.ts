import { useCallback, useRef } from 'react';
import { useStore } from '~/store';

export function useChat() {
  const abortRef = useRef<AbortController | null>(null);
  const {
    currentConversation,
    isStreaming,
    addUserMessage,
    finalizeAssistantMessage,
    setStreaming,
    appendStreamContent,
    appendStreamReasoning,
    resetStream,
    saveConversation,
  } = useStore();

  const send = useCallback(
    async (userContent: string) => {
      if (!currentConversation || isStreaming) return;

      addUserMessage(userContent);
      resetStream();
      setStreaming(true);

      const messages = [
        ...currentConversation.messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        { role: 'user' as const, content: userContent },
      ];

      const controller = new AbortController();
      abortRef.current = controller;

      let fullContent = '';
      let fullReasoning = '';

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages,
            model: currentConversation.model,
            systemPrompt: currentConversation.systemPrompt || undefined,
            thinkingEnabled: currentConversation.thinkingEnabled,
            params: currentConversation.params,
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
                fullContent += parsed.content;
                appendStreamContent(parsed.content);
              } else if (parsed.type === 'reasoning') {
                fullReasoning += parsed.content;
                appendStreamReasoning(parsed.content);
              } else if (parsed.type === 'error') {
                fullContent += `\n\n**Error:** ${parsed.error}`;
                appendStreamContent(`\n\n**Error:** ${parsed.error}`);
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
        finalizeAssistantMessage(fullContent, fullReasoning || undefined);
        setStreaming(false);
        abortRef.current = null;
        setTimeout(() => saveConversation(), 100);
      }
    },
    [
      currentConversation,
      isStreaming,
      addUserMessage,
      resetStream,
      setStreaming,
      appendStreamContent,
      appendStreamReasoning,
      finalizeAssistantMessage,
      saveConversation,
    ],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { send, stop, isStreaming };
}
