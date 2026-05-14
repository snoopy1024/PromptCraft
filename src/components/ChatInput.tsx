import { useState, useCallback, type KeyboardEvent } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import { ArrowUp, Square } from 'lucide-react';
import { useChat } from '~/hooks/useChat';

export default function ChatInput() {
  const [input, setInput] = useState('');
  const { send, stop, isStreaming } = useChat();

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput('');
    send(text);
  }, [input, isStreaming, send]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  return (
    <div className="bg-white px-4 pb-4 pt-2">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-end gap-2 rounded-3xl border border-gray-200 bg-gray-50 px-4 py-2 shadow-sm focus-within:border-gray-300 focus-within:shadow-md transition-shadow">
          <TextareaAutosize
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="有问题，尽管问"
            minRows={1}
            maxRows={10}
            className="flex-1 resize-none bg-transparent py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
            autoFocus
          />
          {isStreaming ? (
            <button
              onClick={stop}
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-900 text-white transition-colors hover:bg-gray-700"
              title="停止生成"
            >
              <Square size={12} fill="currentColor" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-900 text-white transition-colors hover:bg-gray-700 disabled:bg-gray-300 disabled:text-gray-500"
              title="发送"
            >
              <ArrowUp size={16} strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
