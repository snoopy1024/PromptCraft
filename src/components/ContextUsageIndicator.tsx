import { useMemo, useState } from 'react';
import { MessageSquareText } from 'lucide-react';
import { useStore, type Message, type MessageStats } from '~/store';
import { estimateTokens } from '~/utils/messageStats';
import { MODELS } from './ModelSelector';

interface ContextStats {
  contextWindow: number;
  usedTokens: number;
  remainingTokens: number;
  usagePct: number;
  systemTokens: number;
  userTokens: number;
  assistantTokens: number;
  messageTokens: number;
  messageCount: number;
  userMessageCount: number;
  assistantMessageCount: number;
  lastApiPromptTokens?: number;
  cacheHitTokens?: number;
  cacheMissTokens?: number;
  streamingOutputTokens?: number;
  isApiCorrected: boolean;
}

function formatTokenCount(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return String(value);
}

function getRingColor(usagePct: number) {
  if (usagePct >= 90) return '#ef4444';
  if (usagePct >= 75) return '#f59e0b';
  return '#0385ff';
}

function countMessageTokens(messages: Message[]) {
  return messages.reduce(
    (acc, message) => {
      const tokens = estimateTokens(message.content);
      if (message.role === 'user') {
        acc.userTokens += tokens;
        acc.userMessageCount += 1;
      } else {
        acc.assistantTokens += tokens;
        acc.assistantMessageCount += 1;
      }
      return acc;
    },
    {
      userTokens: 0,
      assistantTokens: 0,
      userMessageCount: 0,
      assistantMessageCount: 0,
    },
  );
}

function getAssistantContentTokens(stats?: MessageStats) {
  return stats?.completionTokens ?? 0;
}

export default function ContextUsageIndicator({ isStreaming }: { isStreaming: boolean }) {
  const [open, setOpen] = useState(false);
  const { currentConversation, streamingStats } = useStore();

  const stats = useMemo<ContextStats | null>(() => {
    if (!currentConversation) return null;

    const model = MODELS.find((item) => item.id === currentConversation.model) ?? MODELS[0];
    const contextWindow = model.contextWindow;
    const messages = currentConversation.messages;
    const systemTokens = estimateTokens(currentConversation.systemPrompt || '');
    const counted = countMessageTokens(messages);
    const messageTokens = counted.userTokens + counted.assistantTokens;

    let lastAssistantIndex = -1;
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      if (messages[index].role === 'assistant') {
        lastAssistantIndex = index;
        break;
      }
    }
    const lastAssistant = lastAssistantIndex >= 0 ? messages[lastAssistantIndex] : undefined;
    let usedTokens = systemTokens + messageTokens;
    let isApiCorrected = false;
    let streamingOutputTokens: number | undefined;

    if (lastAssistant?.stats?.promptTokens != null) {
      let extraTokens = 0;
      for (let index = lastAssistantIndex + 1; index < messages.length; index += 1) {
        extraTokens += estimateTokens(messages[index].content);
      }
      usedTokens = lastAssistant.stats.promptTokens + getAssistantContentTokens(lastAssistant.stats) + extraTokens;
      isApiCorrected = true;
    }

    if (isStreaming && streamingStats.promptTokens != null) {
      streamingOutputTokens = getAssistantContentTokens(streamingStats);
      usedTokens = streamingStats.promptTokens + streamingOutputTokens;
      isApiCorrected = true;
    }

    const clampedUsed = Math.max(0, usedTokens);
    const remainingTokens = Math.max(0, contextWindow - clampedUsed);
    const usagePct = contextWindow > 0 ? Math.min(100, (clampedUsed / contextWindow) * 100) : 0;
    const sourceStats = isStreaming && streamingStats.promptTokens != null
      ? streamingStats
      : lastAssistant?.stats;

    return {
      contextWindow,
      usedTokens: clampedUsed,
      remainingTokens,
      usagePct,
      systemTokens,
      userTokens: counted.userTokens,
      assistantTokens: counted.assistantTokens,
      messageTokens,
      messageCount: messages.length,
      userMessageCount: counted.userMessageCount,
      assistantMessageCount: counted.assistantMessageCount,
      lastApiPromptTokens: sourceStats?.promptTokens,
      cacheHitTokens: sourceStats?.promptCacheHitTokens,
      cacheMissTokens: sourceStats?.promptCacheMissTokens,
      streamingOutputTokens,
      isApiCorrected,
    };
  }, [currentConversation, isStreaming, streamingStats]);

  if (!stats) return null;

  const ringColor = getRingColor(stats.usagePct);
  const displayPct = Math.round(stats.usagePct);
  const ringStyle = {
    background: `conic-gradient(${ringColor} ${stats.usagePct * 3.6}deg, #e5e7eb 0deg)`,
  };

  return (
    <div
      className="relative mr-0.5 shrink-0"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-label={`上下文已用 ${displayPct}%`}
        className="flex h-8 w-7 items-center justify-center rounded-full text-gray-500 outline-none focus-visible:ring-2 focus-visible:ring-gray-300"
      >
        <span className="relative flex h-[18px] w-[18px] items-center justify-center rounded-full" style={ringStyle}>
          <span className="h-[11px] w-[11px] rounded-full bg-white" />
        </span>
      </button>

      {open && (
        <div className="pointer-events-none absolute bottom-full right-0 z-50 mb-3 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl shadow-gray-900/10">
          <div className="border-b border-gray-100 px-4 py-3.5">
            <div>
              <div>
                <p className="text-sm font-semibold text-gray-900">上下文窗口</p>
                <p className="mt-1 text-xs leading-5 text-gray-400">
                  {stats.isApiCorrected ? '已结合最近一次 API 返回值校正' : '当前为本地估算'}
                </p>
              </div>
            </div>
          </div>

          <div className="px-4 py-4">
            <div className="flex items-center gap-4">
              <div
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full"
                style={ringStyle}
                aria-hidden="true"
              >
                <div className="flex h-[48px] w-[48px] flex-col items-center justify-center rounded-full bg-white">
                  <span className="text-base font-semibold leading-none text-gray-900">{displayPct}%</span>
                  <span className="mt-1 text-[10px] leading-none text-gray-400">已用</span>
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-xs text-gray-400">已用</span>
                  <span className="text-sm font-semibold tabular-nums text-gray-900">
                    {formatTokenCount(stats.usedTokens)} / {formatTokenCount(stats.contextWindow)} Tokens
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${stats.usagePct}%`, backgroundColor: ringColor }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
                  <span>剩余 {formatTokenCount(stats.remainingTokens)} Tokens</span>
                  <span>{Math.max(0, 100 - displayPct)}% 可用</span>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <Metric label="消息" value={`${stats.messageCount} 条`} />
              <Metric label="窗口" value={`${formatTokenCount(stats.contextWindow)} Tokens`} />
              <Metric label="统计口径" value={stats.isApiCorrected ? 'API 校正' : '本地估算'} />
              <Metric
                label={stats.lastApiPromptTokens != null ? '最近输入' : '正文估算'}
                value={`${formatTokenCount(stats.lastApiPromptTokens ?? stats.messageTokens)} Tokens`}
              />
              <Metric label="用户消息估算" value={`${formatTokenCount(stats.userTokens)} Tokens`} />
              <Metric label="助手回复估算" value={`${formatTokenCount(stats.assistantTokens)} Tokens`} />
            </div>

            <div className="mt-4 rounded-xl bg-gray-50 px-3 py-3">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium text-gray-500">
                <MessageSquareText size={13} />
                当前聊天记录
              </div>
              <div className="space-y-1.5 text-xs text-gray-500">
                <Row label="用户消息" value={`${stats.userMessageCount} 条`} />
                <Row label="助手消息" value={`${stats.assistantMessageCount} 条`} />
                <Row label="系统提示词估算" value={`${formatTokenCount(stats.systemTokens)} Tokens`} />
                {stats.lastApiPromptTokens != null && (
                  <Row label="最近输入上下文" value={`${formatTokenCount(stats.lastApiPromptTokens)} Tokens`} />
                )}
                {stats.cacheHitTokens != null && stats.cacheHitTokens > 0 && (
                  <Row label="缓存命中" value={`${formatTokenCount(stats.cacheHitTokens)} Tokens`} />
                )}
                {stats.cacheMissTokens != null && stats.cacheMissTokens > 0 && (
                  <Row label="缓存未命中" value={`${formatTokenCount(stats.cacheMissTokens)} Tokens`} />
                )}
                {stats.streamingOutputTokens != null && stats.streamingOutputTokens > 0 && (
                  <Row label="本次已输出" value={`${formatTokenCount(stats.streamingOutputTokens)} Tokens`} />
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white px-3 py-2.5">
      <p className="text-[11px] text-gray-400">{label}</p>
      <p className="mt-1 truncate text-xs font-semibold tabular-nums text-gray-800">{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span>{label}</span>
      <span className="font-medium tabular-nums text-gray-800">{value}</span>
    </div>
  );
}
