import { useState, memo, useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { Lightbulb, ChevronDown, Copy, Check } from 'lucide-react';
import type { MessageStats } from '~/store';
import StatsLine from './StatsLine';

interface Props {
  content: string;
  stats?: MessageStats;
  isStreaming?: boolean;
}

const Thinking = memo(function Thinking({ content, stats, isStreaming }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [scrollbarActive, setScrollbarActive] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pinnedToBottomRef = useRef(true);
  const scrollbarTimerRef = useRef<number | undefined>(undefined);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [content]);

  const showScrollbarBriefly = useCallback(() => {
    setScrollbarActive(true);
    window.clearTimeout(scrollbarTimerRef.current);
    scrollbarTimerRef.current = window.setTimeout(() => {
      setScrollbarActive(false);
    }, 900);
  }, []);

  const updatePinnedToBottom = useCallback(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    const distanceToBottom =
      scrollEl.scrollHeight - scrollEl.scrollTop - scrollEl.clientHeight;
    pinnedToBottomRef.current = distanceToBottom < 24;
    showScrollbarBriefly();
  }, [showScrollbarBriefly]);

  useLayoutEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl || !expanded || !isStreaming || !pinnedToBottomRef.current) return;

    scrollEl.scrollTop = scrollEl.scrollHeight;
  }, [content, expanded, isStreaming]);

  useEffect(() => {
    return () => window.clearTimeout(scrollbarTimerRef.current);
  }, []);

  if (!content) return null;

  return (
    <div className="group/thinking mb-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 rounded-lg py-1 text-sm text-gray-400 transition-colors hover:text-gray-600"
        >
          <span className="relative flex h-[18px] w-[18px] items-center justify-center">
            <Lightbulb
              size={16}
              className="absolute text-gray-400 transition-opacity group-hover/thinking:opacity-0"
            />
            <ChevronDown
              size={16}
              className={`absolute text-gray-500 opacity-0 transition-all group-hover/thinking:opacity-100 ${
                expanded ? 'rotate-180' : ''
              }`}
            />
          </span>
          思考过程
          {isStreaming && <span className="result-thinking" />}
        </button>

        <span className="text-xs text-gray-400 opacity-0 transition-opacity group-hover/thinking:opacity-100 group-focus-within/thinking:opacity-100">
          <StatsLine stats={stats} type="reasoning" />
        </span>
      </div>

      {expanded && (
        <div className="group/thinking-box relative mt-3 rounded-xl border border-gray-200 bg-transparent p-4">
          <button
            onClick={handleCopy}
            className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-lg bg-[#f3f1ec] text-gray-500 opacity-0 transition-colors transition-opacity hover:bg-[#e9e6df] hover:text-gray-700 group-hover/thinking-box:opacity-100"
            title={copied ? '已复制' : '复制思考内容'}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </button>
          <div
            ref={scrollRef}
            onScroll={updatePinnedToBottom}
            className={`scrollbar-auto-hide min-h-28 max-h-[400px] overflow-y-auto pr-0.5 ${
              scrollbarActive ? 'scrollbar-active' : ''
            }`}
          >
            <p
              className={`whitespace-pre-wrap text-sm leading-relaxed text-gray-500 ${
                isStreaming ? 'result-streaming' : ''
              }`}
            >
              {content}
            </p>
          </div>
        </div>
      )}
    </div>
  );
});

export default Thinking;
