import { useEffect, useRef } from 'react';
import { useStore } from '~/store';
import MessageBubble from './MessageBubble';
import { Zap } from 'lucide-react';

export default function MessageList() {
  const { currentConversation, isStreaming, streamingContent, streamingReasoning } = useStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentConversation?.messages.length, streamingContent, streamingReasoning]);

  if (!currentConversation) return null;

  const hasMessages = currentConversation.messages.length > 0 || isStreaming;

  return (
    <div className="flex-1 overflow-y-auto bg-white">
      {!hasMessages ? (
        <div className="flex h-full flex-col items-center justify-center gap-4 text-gray-400">
          <Zap size={48} strokeWidth={1.5} />
          <div className="text-center">
            <h2 className="text-lg font-medium text-gray-700">PromptCraft</h2>
            <p className="mt-1 text-sm">输入 Prompt 开始调试</p>
          </div>
        </div>
      ) : (
        <div className="mx-auto max-w-3xl px-4 py-6">
          {currentConversation.messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}

          {isStreaming && (
            <MessageBubble
              message={{
                id: '__streaming__',
                role: 'assistant',
                content: streamingContent,
                reasoning: streamingReasoning || undefined,
              }}
              isStreaming
            />
          )}

          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}
