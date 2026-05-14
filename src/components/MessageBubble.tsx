import { useCallback, useState } from 'react';
import { Check, ChevronDown, ChevronUp, Copy, RotateCcw } from 'lucide-react';
import type { Message } from '~/store';
import Markdown from './Markdown';
import Thinking from './Thinking';
import StatsLine from './StatsLine';
import { estimateTokens } from '~/utils/messageStats';

interface Props {
  message: Message;
  isStreaming?: boolean;
  onRetry?: () => void;
}

const COLLAPSE_CHAR_LIMIT = 420;
const COLLAPSE_LINE_LIMIT = 7;

export default function MessageBubble({ message, isStreaming, onRetry }: Props) {
  const isUser = message.role === 'user';
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const shouldCollapse =
    message.content.length > COLLAPSE_CHAR_LIMIT ||
    message.content.split('\n').length > COLLAPSE_LINE_LIMIT;

  const handleCopy = useCallback(() => {
    if (!message.content) return;
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }, [message.content]);

  if (isUser) {
    const inputTokens = estimateTokens(message.content);

    return (
      <div className="group/user mb-6 mt-3">
        <div className="flex justify-end">
          <div className="max-w-[min(46rem,92%)] rounded-2xl bg-[#efede7] px-5 py-4 text-[15px] leading-6 text-[#2f2f2d] shadow-sm shadow-gray-900/5">
            <div className="relative">
              <div
                className={`whitespace-pre-wrap break-words ${
                  shouldCollapse && !expanded ? 'max-h-36 overflow-hidden' : ''
                }`}
              >
                {message.content}
              </div>
              {shouldCollapse && !expanded && (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-[#efede7] to-transparent" />
              )}
            </div>

            {shouldCollapse && (
              <button
                type="button"
                aria-expanded={expanded}
                onClick={() => setExpanded((value) => !value)}
                className="mt-3 flex items-center gap-1 text-sm font-medium text-gray-500 transition-colors hover:text-gray-800"
              >
                {expanded ? (
                  <>
                    收起
                    <ChevronUp size={15} />
                  </>
                ) : (
                  <>
                    展开
                    <ChevronDown size={15} />
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        <div className="pointer-events-none mt-1.5 flex items-center justify-between text-xs text-gray-400 opacity-0 transition-opacity group-hover/user:pointer-events-auto group-hover/user:opacity-100 group-focus-within/user:pointer-events-auto group-focus-within/user:opacity-100">
          <button
            type="button"
            onClick={handleCopy}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-black/[0.04] hover:text-gray-700"
            title={copied ? '已复制' : '复制输入'}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </button>
          <span className="tabular-nums">{inputTokens} Tokens</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6">
      {message.reasoning && (
        <Thinking
          content={message.reasoning}
          stats={message.stats}
          isStreaming={isStreaming && !message.content}
        />
      )}

      {message.content ? (
        <div className="group/output">
          <div
            className={`prose max-w-none text-[15px] leading-7 text-[#1f1f1d] sm:text-base ${
              isStreaming ? 'result-streaming' : ''
            }`}
          >
            <Markdown content={message.content} />
          </div>

          <div className="pointer-events-none mt-1.5 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-400 opacity-0 transition-opacity group-hover/output:pointer-events-auto group-hover/output:opacity-100 group-focus-within/output:pointer-events-auto group-focus-within/output:opacity-100">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleCopy}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-black/[0.04] hover:text-gray-700"
                title={copied ? '已复制' : '复制输出'}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
              <button
                type="button"
                onClick={onRetry}
                disabled={!onRetry || isStreaming}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-black/[0.04] hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
                title="重新执行这个 Prompt"
              >
                <RotateCcw size={16} />
              </button>
            </div>
            <span className="text-xs text-gray-400">
              <StatsLine stats={message.stats} type="completion" />
            </span>
          </div>
        </div>
      ) : (
        isStreaming &&
        !message.reasoning && <span className="result-thinking text-gray-400 text-sm" />
      )}
    </div>
  );
}
