import { useState, useCallback, type KeyboardEvent } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import { ArrowUp, Plus, Square } from 'lucide-react';
import ChatSettingsPopover from './ChatSettingsPopover';

interface Props {
  send: (content: string) => void;
  stop: () => void;
  isStreaming: boolean;
}

export default function ChatInput({ send, stop, isStreaming }: Props) {
  const [input, setInput] = useState('');

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
    <div className="bg-[#fbfaf7] px-3 pb-3 pt-2 sm:px-4">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-[1.35rem] border border-gray-200 bg-white px-4 pb-3 pt-3 shadow-[0_16px_50px_rgba(0,0,0,0.08)] transition-shadow focus-within:border-gray-300 focus-within:shadow-[0_18px_60px_rgba(0,0,0,0.12)]">
          <TextareaAutosize
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入消息..."
            minRows={1}
            maxRows={12}
            className="w-full resize-none bg-transparent py-1 text-[15px] leading-6 text-gray-900 outline-none placeholder:text-gray-400"
            autoFocus
          />
          <div className="mt-2 flex min-h-9 items-center justify-between gap-3">
            <button
              type="button"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
              title="添加"
            >
              <Plus size={20} />
            </button>
            <div className="flex min-w-0 items-center gap-1.5">
              <ChatSettingsPopover />
              {isStreaming ? (
                <button
                  type="button"
                  onClick={stop}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-900 text-white transition-colors hover:bg-gray-700"
                  title="停止生成"
                >
                  <Square size={12} fill="currentColor" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-900 text-white transition-colors hover:bg-gray-700 disabled:bg-gray-200 disabled:text-gray-400"
                  title="发送"
                >
                  <ArrowUp size={16} strokeWidth={2.5} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
