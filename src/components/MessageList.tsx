import { useEffect, useRef } from 'react';
import { useStore } from '~/store';
import MessageBubble from './MessageBubble';
import { Zap } from 'lucide-react';

interface Props {
  onRetry: (assistantId: string) => void;
  onEditSend: (messageId: string, newContent: string) => void;
  onOpenTriptych: (messageId: string) => void;
}

export default function MessageList({ onRetry, onEditSend, onOpenTriptych }: Props) {
  const {
    currentConversation,
    isStreaming,
    streamingContent,
    streamingReasoning,
    streamingError,
    streamingStats,
  } = useStore();
  const listRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pinnedToBottomRef = useRef(true);

  useEffect(() => {
    if (pinnedToBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentConversation?.messages.length, streamingContent, streamingReasoning]);

  const handleScroll = () => {
    const scrollEl = listRef.current;
    if (!scrollEl) return;

    const distanceToBottom =
      scrollEl.scrollHeight - scrollEl.scrollTop - scrollEl.clientHeight;
    pinnedToBottomRef.current = distanceToBottom < 48;
  };

  if (!currentConversation) return null;

  const hasMessages = currentConversation.messages.length > 0 || isStreaming;

  return (
    <div ref={listRef} onScroll={handleScroll} className="flex-1 overflow-y-auto bg-[#fbfaf7]">
      {!hasMessages ? (
        <div className="flex h-full flex-col items-center justify-center gap-4 text-gray-400">
          <Zap size={48} strokeWidth={1.5} />
          <div className="text-center">
            <h2 className="text-lg font-medium text-gray-700">PromptCraft</h2>
            <p className="mt-1 text-sm">输入 Prompt 开始调试</p>
          </div>
        </div>
      ) : (
        <div className="mx-auto flex max-w-3xl flex-col px-4 pb-8 pt-6 sm:px-6">
          {currentConversation.messages.map((msg, idx) => {
            const nextMsg = currentConversation.messages[idx + 1];
            const assistantStats =
              msg.role === 'user' && nextMsg?.role === 'assistant'
                ? nextMsg.stats
                : undefined;
            const msgModel = msg.role === 'assistant'
              ? msg.model ?? currentConversation.model
              : nextMsg?.role === 'assistant'
                ? nextMsg.model ?? currentConversation.model
                : currentConversation.model;
            return (
              <MessageBubble
                key={msg.id}
                message={msg}
                model={msgModel}
                assistantStats={assistantStats}
                onRetry={msg.role === 'assistant' ? () => onRetry(msg.id) : undefined}
                onEditSend={msg.role === 'user' ? onEditSend : undefined}
                onOpenTriptych={msg.role === 'user' ? () => onOpenTriptych(msg.id) : undefined}
              />
            );
          })}

          {isStreaming && (
            <MessageBubble
              message={{
                id: '__streaming__',
                role: 'assistant',
                content: streamingContent,
                reasoning: streamingReasoning || undefined,
                error: streamingError,
                stats: streamingStats,
              }}
              model={currentConversation.model}
              isStreaming
            />
          )}

          <div ref={bottomRef} className="h-2" />
        </div>
      )}
    </div>
  );
}
