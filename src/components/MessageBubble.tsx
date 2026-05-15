import { useCallback, useRef, useState, useEffect } from 'react';
import { Check, ChevronDown, ChevronUp, Copy, MessageSquareText, Pencil, RotateCcw } from 'lucide-react';
import TextareaAutosize from 'react-textarea-autosize';
import type { Message, MessageStats } from '~/store';
import Markdown from './Markdown';
import Thinking from './Thinking';
import StatsLine from './StatsLine';
import PricingPopup from './PricingPopup';
import TokenDetailPopup from './TokenDetailPopup';
import { estimateTokens, inputCostCny, formatCost, MODEL_PRICING } from '~/utils/messageStats';

interface Props {
  message: Message;
  model?: string;
  assistantStats?: MessageStats;
  isStreaming?: boolean;
  onRetry?: () => void;
  onEditSend?: (messageId: string, newContent: string) => void;
}

const COLLAPSE_CHAR_LIMIT = 420;
const COLLAPSE_LINE_LIMIT = 7;

export default function MessageBubble({ message, model, assistantStats, isStreaming, onRetry, onEditSend }: Props) {
  const isUser = message.role === 'user';
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [showInputPricing, setShowInputPricing] = useState(false);
  const [showTokenDetail, setShowTokenDetail] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const shouldCollapse =
    message.content.length > COLLAPSE_CHAR_LIMIT ||
    message.content.split('\n').length > COLLAPSE_LINE_LIMIT;

  const handleCopy = useCallback(() => {
    if (!message.content) return;
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }, [message.content]);

  const startEditing = useCallback(() => {
    setEditContent(message.content);
    setEditing(true);
  }, [message.content]);

  const cancelEditing = useCallback(() => {
    setEditing(false);
  }, []);

  const submitEdit = useCallback(() => {
    const text = editContent.trim();
    if (!text || !onEditSend) return;
    setEditing(false);
    onEditSend(message.id, text);
  }, [editContent, message.id, onEditSend]);

  useEffect(() => {
    if (editing && textareaRef.current) {
      const ta = textareaRef.current;
      ta.focus();
      ta.setSelectionRange(ta.value.length, ta.value.length);
    }
  }, [editing]);

  if (isUser) {
    const estimatedTokens = estimateTokens(message.content);
    const hasApiTokens = assistantStats?.promptTokens !== undefined;
    const inputTokens = hasApiTokens ? assistantStats.promptTokens! : estimatedTokens;
    const cacheHitTokens = assistantStats?.promptCacheHitTokens ?? 0;
    const cacheMissTokens = assistantStats?.promptCacheMissTokens ?? 0;

    if (editing) {
      return (
        <div className="mb-1 mt-2">
          <div className="flex justify-end">
            <div className="max-w-[min(46rem,92%)] w-full">
              <div className="rounded-2xl border-2 border-blue-400 bg-white px-4 py-3 shadow-sm">
                <TextareaAutosize
                  ref={textareaRef}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  minRows={2}
                  maxRows={16}
                  className="w-full resize-none bg-transparent text-[15px] leading-6 text-[#2f2f2d] outline-none"
                />
              </div>
              <div className="mt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={cancelEditing}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={submitEdit}
                  disabled={!editContent.trim()}
                  className="rounded-lg bg-gray-800 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:bg-gray-300 disabled:text-gray-500"
                >
                  发送
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="group/user mb-0 mt-2">
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

        <div className="pointer-events-none mt-1.5 flex items-center justify-end gap-3 text-xs text-gray-400 opacity-0 transition-opacity group-hover/user:pointer-events-auto group-hover/user:opacity-100 group-focus-within/user:pointer-events-auto group-focus-within/user:opacity-100">
          <span className="relative">
            <button
              type="button"
              onClick={() => setShowTokenDetail(true)}
              className="inline-flex items-center gap-1 rounded tabular-nums transition-colors hover:text-gray-600"
              title="查看 Token 详情"
            >
              <MessageSquareText size={13} />
              {estimatedTokens}t
            </button>
            {showTokenDetail && (
              <TokenDetailPopup
                estimatedTokens={estimatedTokens}
                promptTokens={hasApiTokens ? inputTokens : undefined}
                cacheHitTokens={cacheHitTokens}
                cacheMissTokens={cacheMissTokens}
                onClose={() => setShowTokenDetail(false)}
              />
            )}
          </span>
          {model && (() => {
            const cost = hasApiTokens
              ? inputCostCny(model, inputTokens, cacheHitTokens, cacheMissTokens)
              : inputCostCny(model, inputTokens);
            const pricing = MODEL_PRICING[model];
            const costItems = hasApiTokens
              ? [
                  ...(cacheHitTokens > 0 ? [{
                    label: '输入（缓存命中）',
                    tokens: cacheHitTokens,
                    pricePerM: pricing?.inputCacheHit ?? 0,
                    cost: (cacheHitTokens / 1_000_000) * (pricing?.inputCacheHit ?? 0),
                  }] : []),
                  {
                    label: '输入（缓存未命中）',
                    tokens: cacheMissTokens,
                    pricePerM: pricing?.inputCacheMiss ?? 0,
                    cost: (cacheMissTokens / 1_000_000) * (pricing?.inputCacheMiss ?? 0),
                  },
                ]
              : [{
                  label: '输入（估算）',
                  tokens: inputTokens,
                  pricePerM: pricing?.inputCacheMiss ?? 0,
                  cost,
                }];
            return (
              <span className="relative">
                <button
                  type="button"
                  onClick={() => setShowInputPricing(true)}
                  className="inline-flex items-center gap-1 rounded tabular-nums transition-colors hover:text-gray-600"
                  title="查看费用明细"
                >
                  {formatCost(cost)}
                </button>
                {showInputPricing && (
                  <PricingPopup
                    model={model}
                    items={costItems}
                    totalCost={cost}
                    onClose={() => setShowInputPricing(false)}
                  />
                )}
              </span>
            );
          })()}
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={startEditing}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-black/[0.04] hover:text-gray-700"
              title="编辑"
            >
              <Pencil size={15} />
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-black/[0.04] hover:text-gray-700"
              title={copied ? '已复制' : '复制输入'}
            >
              {copied ? <Check size={15} /> : <Copy size={15} />}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4">
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
              <StatsLine stats={message.stats} model={model} type="unified" />
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
