import { type Dispatch, type SetStateAction, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Brain,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  FileOutput,
  Gauge,
  MessageSquareText,
  Play,
  TextCursorInput,
  Square,
} from 'lucide-react';
import { useStore, type Message, type MessageStats } from '~/store';
import { getPromptTurns } from '~/utils/conversationTurns';
import {
  estimateTokens,
  formatCost,
  formatDuration,
  inputCostCny,
  MODEL_PRICING,
} from '~/utils/messageStats';
import { MODELS } from './ModelSelector';
import ChatSettingsPopover from './ChatSettingsPopover';
import Markdown from './Markdown';
import deepSeekIcon from '~/assets/deepseek.png';
import PricingPopup from './PricingPopup';
import TokenDetailPopup from './TokenDetailPopup';
import ModelParamsPopup from './ModelParamsPopup';

const NEW_PROMPT_KEY = '__new_prompt__';
const PANEL_TITLE_WIDTH = 86;
const PANEL_MIN_WIDTH = PANEL_TITLE_WIDTH;
const DIVIDER_WIDTH = 1;
const SNAP_DISTANCE = 18;
const KEYBOARD_RESIZE_STEP = 24;
const KEYBOARD_RESIZE_STEP_LARGE = 72;

type PanelWidths = [number, number, number];
type DividerIndex = 0 | 1;

const DEFAULT_PANEL_WIDTHS: PanelWidths = [1 / 3, 1 / 3, 1 / 3];

export interface TriptychUiState {
  selectedByConversation: Record<string, string>;
  draftsByConversation: Record<string, Record<string, string>>;
  panelWidthsByConversation: Record<string, PanelWidths>;
}

interface Props {
  send: (content: string) => void | Promise<void>;
  editAndResend: (messageId: string, newContent: string) => void | Promise<void>;
  stop: () => void;
  isStreaming: boolean;
  uiState: TriptychUiState;
  setUiState: Dispatch<SetStateAction<TriptychUiState>>;
}

function modelShortName(model?: string) {
  if (!model) return '未知模型';
  return MODELS.find((item) => item.id === model)?.shortName ?? model;
}

function formatTokens(tokens?: number, estimated?: boolean) {
  return `${estimated ? '~' : ''}${tokens ?? 0}t`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function normalizePanelWidths(widths?: PanelWidths): PanelWidths {
  if (!widths) return DEFAULT_PANEL_WIDTHS;
  const next = widths.map((width) => (Number.isFinite(width) && width > 0 ? width : 0));
  const total = next.reduce((sum, width) => sum + width, 0);
  if (total <= 0) return DEFAULT_PANEL_WIDTHS;
  return [next[0] / total, next[1] / total, next[2] / total];
}

function constrainPanelWidths(widths: PanelWidths, availableWidth: number): PanelWidths {
  if (availableWidth <= PANEL_MIN_WIDTH * 3) return DEFAULT_PANEL_WIDTHS;

  const pixels = normalizePanelWidths(widths).map((width) => width * availableWidth);
  const locked = [false, false, false];

  for (let i = 0; i < 3; i += 1) {
    const remainingIndexes = pixels
      .map((_, index) => index)
      .filter((index) => !locked[index]);
    const tooSmall = remainingIndexes.filter((index) => pixels[index] < PANEL_MIN_WIDTH);
    if (!tooSmall.length) break;

    for (const index of tooSmall) {
      pixels[index] = PANEL_MIN_WIDTH;
      locked[index] = true;
    }

    const remainingWidth = availableWidth - locked.reduce(
      (sum, isLocked, index) => sum + (isLocked ? pixels[index] : 0),
      0,
    );
    const unlocked = pixels.map((_, index) => index).filter((index) => !locked[index]);
    const unlockedTotal = unlocked.reduce((sum, index) => sum + pixels[index], 0);

    if (!unlocked.length || remainingWidth <= 0) break;
    for (const index of unlocked) {
      pixels[index] = unlockedTotal > 0
        ? (pixels[index] / unlockedTotal) * remainingWidth
        : remainingWidth / unlocked.length;
    }
  }

  return [pixels[0] / availableWidth, pixels[1] / availableWidth, pixels[2] / availableWidth];
}

function snapToDefault(value: number, target: number, min: number, max: number) {
  if (Math.abs(value - target) <= SNAP_DISTANCE) {
    return clamp(target, min, max);
  }

  return value;
}

function resizePanelWidths(
  widths: PanelWidths,
  divider: DividerIndex,
  deltaX: number,
  availableWidth: number,
): PanelWidths {
  const pixels = constrainPanelWidths(widths, availableWidth).map((width) => width * availableWidth);

  if (divider === 0) {
    const pairWidth = pixels[0] + pixels[1];
    const min = PANEL_MIN_WIDTH;
    const max = pairWidth - PANEL_MIN_WIDTH;
    const nextInputWidth = snapToDefault(
      clamp(pixels[0] + deltaX, min, max),
      availableWidth / 3,
      min,
      max,
    );
    pixels[0] = nextInputWidth;
    pixels[1] = pairWidth - nextInputWidth;
  } else {
    const pairWidth = pixels[1] + pixels[2];
    const min = PANEL_MIN_WIDTH;
    const max = pairWidth - PANEL_MIN_WIDTH;
    let nextReasoningWidth = clamp(pixels[1] + deltaX, min, max);
    const nextBoundary = pixels[0] + nextReasoningWidth;
    const snappedBoundary = snapToDefault(
      nextBoundary,
      (availableWidth / 3) * 2,
      pixels[0] + min,
      pixels[0] + max,
    );
    nextReasoningWidth = snappedBoundary - pixels[0];
    pixels[1] = nextReasoningWidth;
    pixels[2] = pairWidth - nextReasoningWidth;
  }

  return [pixels[0] / availableWidth, pixels[1] / availableWidth, pixels[2] / availableWidth];
}

function IconButton({
  title,
  disabled,
  onClick,
  children,
}: {
  title: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex h-12 w-11 shrink-0 items-center justify-center border-r border-[#eeeae2] text-[#2f2f2d] outline-none transition-colors hover:bg-black/[0.03] focus-visible:ring-2 focus-visible:ring-gray-300 disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:bg-transparent"
      title={title}
    >
      {children}
    </button>
  );
}

function PanelTitle({
  icon,
  label,
  streaming,
  separated,
}: {
  icon: React.ReactNode;
  label: string;
  streaming?: boolean;
  separated?: boolean;
}) {
  return (
    <div
      className={`flex h-12 w-[86px] shrink-0 items-center justify-center gap-1.5 text-[13px] font-medium text-[#2f2f2d] ${
        separated ? 'border-r border-[#eeeae2]' : ''
      }`}
    >
      {icon}
      <span>{label}</span>
      {streaming && <span className="result-thinking" />}
    </div>
  );
}

function useScrollbarActivity() {
  const [active, setActive] = useState(false);
  const timerRef = useRef<number | undefined>(undefined);

  const handleScroll = useCallback(() => {
    setActive(true);
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      setActive(false);
    }, 900);
  }, []);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  return {
    onScroll: handleScroll,
    className: active ? 'scrollbar-active' : '',
  };
}

function FooterItem({
  icon,
  value,
  title,
  asButton,
  onClick,
}: {
  icon?: React.ReactNode;
  value: string;
  title: string;
  asButton?: boolean;
  onClick?: () => void;
}) {
  const content = (
    <>
      {icon}
      <span className="truncate">{value}</span>
    </>
  );

  if (asButton) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="inline-flex min-w-0 items-center gap-1 rounded transition-colors hover:text-gray-600"
        title={title}
      >
        {content}
      </button>
    );
  }

  return (
    <span className="inline-flex min-w-0 items-center gap-1" title={title}>
      {content}
    </span>
  );
}

function Footer({
  contentToCopy,
  children,
}: {
  contentToCopy: string;
  children: React.ReactNode;
}) {
  return (
    <footer className="flex h-10 shrink-0 items-center justify-between gap-3 border-t border-[#eeeae2] px-3 text-xs text-[#94a0af]">
      <FooterCopyButton content={contentToCopy} />
      <div className="flex min-w-0 flex-1 items-center justify-end gap-4 overflow-visible whitespace-nowrap tabular-nums">
        {children}
      </div>
    </footer>
  );
}

function BlankFooter() {
  return <footer className="h-10 shrink-0 border-t border-[#eeeae2]" />;
}

function FooterCopyButton({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);
  const canCopy = content.length > 0;

  const handleCopy = useCallback(() => {
    if (!canCopy) return;
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }, [canCopy, content]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={!canCopy}
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-black/[0.04] hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-gray-400"
      title={copied ? '已复制' : '复制当前栏内容'}
    >
      {copied ? <Check size={15} /> : <Copy size={15} />}
    </button>
  );
}

function inputCostItems(model: string, tokens: number, stats?: MessageStats, useEstimate?: boolean) {
  const pricing = MODEL_PRICING[model];
  const cacheHit = stats?.promptCacheHitTokens ?? 0;
  const cacheMiss = stats?.promptCacheMissTokens ?? 0;

  if (!useEstimate && stats?.promptTokens !== undefined) {
    return [
      ...(cacheHit > 0 ? [{
        label: '输入（缓存命中）',
        tokens: cacheHit,
        pricePerM: pricing?.inputCacheHit ?? 0,
        cost: (cacheHit / 1_000_000) * (pricing?.inputCacheHit ?? 0),
      }] : []),
      {
        label: '输入（缓存未命中）',
        tokens: cacheMiss,
        pricePerM: pricing?.inputCacheMiss ?? 0,
        cost: (cacheMiss / 1_000_000) * (pricing?.inputCacheMiss ?? 0),
      },
    ];
  }

  return [{
    label: '输入（估算）',
    tokens,
    pricePerM: pricing?.inputCacheMiss ?? 0,
    cost: inputCostCny(model, tokens),
  }];
}

function outputCostItems(
  model: string,
  label: '思考' | '输出',
  tokens: number,
  cost: number,
) {
  return [{
    label,
    tokens,
    pricePerM: MODEL_PRICING[model]?.output ?? 0,
    cost,
  }];
}

function InputStatsFooter({
  model,
  content,
  stats,
  useEstimate,
}: {
  model: string;
  content: string;
  stats?: MessageStats;
  useEstimate: boolean;
}) {
  const [showTokenDetail, setShowTokenDetail] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [showModelParams, setShowModelParams] = useState(false);
  const estimatedTokens = estimateTokens(content);
  const tokens = useEstimate ? estimatedTokens : stats?.promptTokens ?? estimatedTokens;
  const cost = useEstimate
    ? inputCostCny(model, tokens)
    : stats?.promptCostCny
      ?? (stats?.promptTokens !== undefined
        ? inputCostCny(
          model,
          stats.promptTokens,
          stats.promptCacheHitTokens ?? 0,
          stats.promptCacheMissTokens ?? 0,
        )
        : inputCostCny(model, tokens));
  const cacheHitTokens = stats?.promptCacheHitTokens ?? 0;
  const cacheMissTokens = stats?.promptCacheMissTokens ?? 0;
  const costItems = inputCostItems(model, tokens, stats, useEstimate);

  return (
    <Footer contentToCopy={content}>
      <span className="relative inline-flex min-w-0">
        <FooterItem
          title="查看请求参数"
          value={modelShortName(model)}
          asButton={Boolean(stats?.requestParams)}
          onClick={() => setShowModelParams(true)}
          icon={<img src={deepSeekIcon} alt="" className="h-3.5 w-3.5 rounded-full object-contain" draggable={false} />}
        />
        {showModelParams && stats?.requestParams && (
          <ModelParamsPopup stats={stats} onClose={() => setShowModelParams(false)} />
        )}
      </span>
      <span className="relative inline-flex min-w-0">
        <FooterItem
          title="查看 Token 详情"
          value={formatTokens(tokens, useEstimate || stats?.promptTokens === undefined)}
          asButton
          onClick={() => setShowTokenDetail(true)}
          icon={<MessageSquareText size={13} />}
        />
        {showTokenDetail && (
          <TokenDetailPopup
            estimatedTokens={estimatedTokens}
            promptTokens={useEstimate ? undefined : tokens}
            cacheHitTokens={cacheHitTokens}
            cacheMissTokens={cacheMissTokens}
            onClose={() => setShowTokenDetail(false)}
          />
        )}
      </span>
      <span className="relative inline-flex min-w-0">
        <FooterItem
          title="查看费用明细"
          value={formatCost(cost)}
          asButton
          onClick={() => setShowPricing(true)}
        />
        {showPricing && (
          <PricingPopup
            model={model}
            items={costItems}
            totalCost={cost}
            onClose={() => setShowPricing(false)}
          />
        )}
      </span>
    </Footer>
  );
}

function ReasoningStatsFooter({ model, content, stats }: { model: string; content: string; stats?: MessageStats }) {
  const [showPricing, setShowPricing] = useState(false);
  const tokens = stats?.reasoningTokens ?? 0;
  const cost = stats?.reasoningCostCny ?? 0;

  return (
    <Footer contentToCopy={content}>
      <FooterItem
        title="思考 Tokens"
        value={formatTokens(tokens, stats?.reasoningEstimated)}
        icon={<Brain size={13} />}
      />
      <FooterItem
        title="思考速度"
        value={`${Math.round(stats?.reasoningTokensPerSecond ?? 0)}t/s`}
        icon={<Gauge size={13} />}
      />
      <span className="relative inline-flex min-w-0">
        <FooterItem
          title="查看费用明细"
          value={formatCost(stats?.reasoningCostCny)}
          asButton
          onClick={() => setShowPricing(true)}
        />
        {showPricing && (
          <PricingPopup
            model={model}
            items={outputCostItems(model, '思考', tokens, cost)}
            totalCost={cost}
            onClose={() => setShowPricing(false)}
          />
        )}
      </span>
      <FooterItem
        title="思考耗时"
        value={formatDuration(stats?.reasoningDurationMs)}
        icon={<Clock size={13} />}
      />
    </Footer>
  );
}

function OutputStatsFooter({ model, content, stats }: { model: string; content: string; stats?: MessageStats }) {
  const [showPricing, setShowPricing] = useState(false);
  const tokens = stats?.completionTokens ?? 0;
  const cost = stats?.completionCostCny ?? 0;

  return (
    <Footer contentToCopy={content}>
      <FooterItem
        title="输出 Tokens"
        value={formatTokens(tokens, stats?.completionEstimated)}
        icon={<MessageSquareText size={13} />}
      />
      <FooterItem
        title="输出速度"
        value={`${Math.round(stats?.completionTokensPerSecond ?? 0)}t/s`}
        icon={<Gauge size={13} />}
      />
      <span className="relative inline-flex min-w-0">
        <FooterItem
          title="查看费用明细"
          value={formatCost(stats?.completionCostCny)}
          asButton
          onClick={() => setShowPricing(true)}
        />
        {showPricing && (
          <PricingPopup
            model={model}
            items={outputCostItems(model, '输出', tokens, cost)}
            totalCost={cost}
            onClose={() => setShowPricing(false)}
          />
        )}
      </span>
      <FooterItem
        title="输出耗时"
        value={formatDuration(stats?.completionDurationMs)}
        icon={<Clock size={13} />}
      />
    </Footer>
  );
}

function EmptyPanel({ label }: { label: string }) {
  return (
    <div className="flex h-full items-start px-5 py-5 text-sm text-gray-300">
      {label}
    </div>
  );
}

function ErrorPanel({ message }: { message: Message }) {
  if (!message.error) return null;

  return (
    <div className="m-5 rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-sm text-amber-950">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
          <AlertTriangle size={15} />
        </span>
        <div className="min-w-0">
          <div className="font-medium">{message.error.title}</div>
          <p className="mt-1 leading-6 text-amber-900/80">{message.error.message}</p>
        </div>
      </div>
    </div>
  );
}

function ResizeHandle({
  divider,
  dragging,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onKeyDown,
  onDoubleClick,
}: {
  divider: DividerIndex;
  dragging: boolean;
  onPointerDown: (divider: DividerIndex, event: React.PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (event: React.PointerEvent<HTMLDivElement>) => void;
  onKeyDown: (divider: DividerIndex, event: React.KeyboardEvent<HTMLDivElement>) => void;
  onDoubleClick: () => void;
}) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={divider === 0 ? '调整输入和思考栏宽度' : '调整思考和输出栏宽度'}
      tabIndex={0}
      onPointerDown={(event) => onPointerDown(divider, event)}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={(event) => onKeyDown(divider, event)}
      onDoubleClick={onDoubleClick}
      className={`group relative z-30 min-h-0 w-px cursor-col-resize touch-none bg-[#eeeae2] outline-none transition-colors hover:bg-[#8fa0b2] focus-visible:bg-[#0385FF] ${
        dragging ? 'bg-[#0385FF]' : ''
      }`}
      title="拖动调整宽度，双击恢复三等分"
    >
      <div className="absolute inset-y-0 left-1/2 w-3 -translate-x-1/2" />
      <div
        className={`absolute inset-y-0 left-1/2 w-px -translate-x-1/2 transition-colors group-hover:bg-[#8fa0b2] group-focus-visible:bg-[#0385FF] ${
          dragging ? 'bg-[#0385FF]' : ''
        }`}
      />
    </div>
  );
}

export default function TriptychView({
  send,
  editAndResend,
  stop,
  isStreaming,
  uiState,
  setUiState,
}: Props) {
  const {
    currentConversation,
    streamingContent,
    streamingReasoning,
    streamingError,
    streamingStats,
  } = useStore();

  const turns = useMemo(
    () => getPromptTurns(currentConversation?.messages ?? []),
    [currentConversation?.messages],
  );
  const conversationId = currentConversation?.id;
  const fallbackKey = turns[0]?.key ?? NEW_PROMPT_KEY;
  const storedSelectedKey = conversationId
    ? uiState.selectedByConversation[conversationId]
    : undefined;
  const selectedTurn = turns.find((turn) => turn.key === storedSelectedKey);
  const selectedKeyIsValid = storedSelectedKey === NEW_PROMPT_KEY || Boolean(selectedTurn);
  const activeKey = selectedKeyIsValid ? storedSelectedKey! : fallbackKey;
  const activeTurn = activeKey === NEW_PROMPT_KEY
    ? undefined
    : turns.find((turn) => turn.key === activeKey);
  const isNewPrompt = activeKey === NEW_PROMPT_KEY;
  const originalContent = activeTurn?.user.content ?? '';
  const drafts = conversationId ? uiState.draftsByConversation[conversationId] ?? {} : {};
  const draft = drafts[activeKey] ?? originalContent;
  const normalizedDraft = draft.trim();
  const normalizedOriginal = originalContent.trim();
  const dirty = isNewPrompt
    ? normalizedDraft.length > 0
    : normalizedDraft !== normalizedOriginal;
  const hasAssistant = Boolean(activeTurn?.assistant);
  const canRun = Boolean(
    conversationId &&
    !isStreaming &&
    normalizedDraft &&
    (isNewPrompt || dirty || !hasAssistant),
  );
  const lastTurn = turns.at(-1);
  const isShowingStreaming = Boolean(isStreaming && lastTurn && activeKey === lastTurn.key);
  const assistantMessage = isShowingStreaming
    ? {
      id: '__streaming__',
      role: 'assistant' as const,
      content: streamingContent,
      reasoning: streamingReasoning || undefined,
      error: streamingError,
      stats: streamingStats,
      model: currentConversation?.model,
    }
    : activeTurn?.assistant;
  const stats = assistantMessage?.stats;
  const model = (dirty || isNewPrompt || !assistantMessage)
    ? currentConversation?.model ?? 'deepseek-v4-flash'
    : assistantMessage.model ?? currentConversation?.model ?? 'deepseek-v4-flash';

  const navKeys = useMemo(() => {
    const keys = turns.map((turn) => turn.key);
    keys.push(NEW_PROMPT_KEY);
    return keys;
  }, [turns]);
  const navIndex = Math.max(0, navKeys.indexOf(activeKey));
  const canGoPrev = !isStreaming && navIndex > 0;
  const canGoNext = !isStreaming && navIndex < navKeys.length - 1;
  const nextKey = canGoNext ? navKeys[navIndex + 1] : undefined;
  const nextTitle = nextKey === NEW_PROMPT_KEY ? '新输入' : '下一个 Prompt';
  const shellScrollbar = useScrollbarActivity();
  const inputScrollbar = useScrollbarActivity();
  const reasoningScrollbar = useScrollbarActivity();
  const outputScrollbar = useScrollbarActivity();
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<{
    divider: DividerIndex;
    startX: number;
    startWidths: PanelWidths;
    availableWidth: number;
  } | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [draggingDivider, setDraggingDivider] = useState<DividerIndex | null>(null);

  const rawPanelWidths = conversationId
    ? uiState.panelWidthsByConversation?.[conversationId]
    : undefined;
  const panelAvailableWidth = Math.max(
    containerWidth - (DIVIDER_WIDTH * 2),
    PANEL_MIN_WIDTH * 3,
  );
  const panelWidths = useMemo(
    () => constrainPanelWidths(normalizePanelWidths(rawPanelWidths), panelAvailableWidth),
    [panelAvailableWidth, rawPanelWidths],
  );
  const panelPixels = panelWidths.map((width) => width * panelAvailableWidth);
  const panelCollapsed = panelPixels.map((width) => width <= PANEL_MIN_WIDTH + 2);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const resizeObserver = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width);
    });
    resizeObserver.observe(element);
    setContainerWidth(element.getBoundingClientRect().width);

    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (draggingDivider === null) return undefined;

    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    return () => {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
    };
  }, [draggingDivider]);

  const setSelectedKey = (key: string) => {
    if (!conversationId) return;
    setUiState((prev) => ({
      ...prev,
      selectedByConversation: {
        ...prev.selectedByConversation,
        [conversationId]: key,
      },
    }));
  };

  const setDraft = (key: string, value: string, original = '') => {
    if (!conversationId) return;
    setUiState((prev) => {
      const conversationDrafts = { ...(prev.draftsByConversation[conversationId] ?? {}) };
      if (value === original || (key === NEW_PROMPT_KEY && value.trim() === '')) {
        delete conversationDrafts[key];
      } else {
        conversationDrafts[key] = value;
      }

      return {
        ...prev,
        draftsByConversation: {
          ...prev.draftsByConversation,
          [conversationId]: conversationDrafts,
        },
      };
    });
  };

  const setPanelWidths = useCallback((widths: PanelWidths) => {
    if (!conversationId) return;
    setUiState((prev) => ({
      ...prev,
      panelWidthsByConversation: {
        ...(prev.panelWidthsByConversation ?? {}),
        [conversationId]: widths,
      },
    }));
  }, [conversationId, setUiState]);

  const resetPanelWidths = useCallback(() => {
    setPanelWidths(DEFAULT_PANEL_WIDTHS);
  }, [setPanelWidths]);

  const handleDividerPointerDown = (
    divider: DividerIndex,
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStateRef.current = {
      divider,
      startX: event.clientX,
      startWidths: panelWidths,
      availableWidth: panelAvailableWidth,
    };
    setDraggingDivider(divider);
  };

  const handleDividerPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState) return;

    event.preventDefault();
    setPanelWidths(resizePanelWidths(
      dragState.startWidths,
      dragState.divider,
      event.clientX - dragState.startX,
      dragState.availableWidth,
    ));
  };

  const stopDividerDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStateRef.current) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragStateRef.current = null;
    setDraggingDivider(null);
  };

  const handleDividerKeyDown = (
    divider: DividerIndex,
    event: React.KeyboardEvent<HTMLDivElement>,
  ) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;

    event.preventDefault();
    const direction = event.key === 'ArrowLeft' ? -1 : 1;
    const step = event.shiftKey ? KEYBOARD_RESIZE_STEP_LARGE : KEYBOARD_RESIZE_STEP;
    setPanelWidths(resizePanelWidths(panelWidths, divider, direction * step, panelAvailableWidth));
  };

  const clearDraft = (key: string) => {
    if (!conversationId) return;
    setUiState((prev) => {
      const conversationDrafts = { ...(prev.draftsByConversation[conversationId] ?? {}) };
      delete conversationDrafts[key];

      return {
        ...prev,
        draftsByConversation: {
          ...prev.draftsByConversation,
          [conversationId]: conversationDrafts,
        },
      };
    });
  };

  useEffect(() => {
    if (!conversationId || selectedKeyIsValid) return;
    setSelectedKey(fallbackKey);
  }, [conversationId, fallbackKey, selectedKeyIsValid]);

  const handleRun = () => {
    if (!canRun || !conversationId) return;
    const text = normalizedDraft;

    if (isNewPrompt) {
      clearDraft(NEW_PROMPT_KEY);
      void send(text);
      const nextConversation = useStore.getState().currentConversation;
      const nextTurn = getPromptTurns(nextConversation?.messages ?? []).at(-1);
      setSelectedKey(nextTurn?.key ?? NEW_PROMPT_KEY);
      return;
    }

    clearDraft(activeKey);
    void editAndResend(activeKey, text);
  };

  if (!currentConversation) return null;

  return (
    <div
      ref={containerRef}
      onScroll={shellScrollbar.onScroll}
      className={`scrollbar-auto-hide grid min-h-0 flex-1 overflow-x-auto overflow-y-hidden border-t border-[#eeeae2] bg-[#fbfaf7] ${shellScrollbar.className}`}
      style={{
        gridTemplateColumns: `minmax(${PANEL_MIN_WIDTH}px, ${panelWidths[0]}fr) ${DIVIDER_WIDTH}px minmax(${PANEL_MIN_WIDTH}px, ${panelWidths[1]}fr) ${DIVIDER_WIDTH}px minmax(${PANEL_MIN_WIDTH}px, ${panelWidths[2]}fr)`,
      }}
    >
      <section className="flex min-h-0 min-w-0 flex-col overflow-hidden">
        <div className="relative z-20 flex h-12 shrink-0 items-center border-b border-[#eeeae2] bg-[#fbfaf7]">
          <PanelTitle icon={<TextCursorInput size={15} />} label="输入" separated />
          <IconButton title="上一个 Prompt" disabled={!canGoPrev} onClick={() => setSelectedKey(navKeys[navIndex - 1])}>
            <ChevronUp size={21} />
          </IconButton>
          <IconButton title={nextTitle} disabled={!canGoNext} onClick={() => setSelectedKey(navKeys[navIndex + 1])}>
            <ChevronDown size={21} />
          </IconButton>
          <div className="ml-auto min-w-0">
            <ChatSettingsPopover placement="below" variant="toolbar" />
          </div>
          {isStreaming ? (
            <button
              type="button"
              onClick={stop}
              className="flex h-12 w-[52px] shrink-0 items-center justify-center bg-gray-900 text-white outline-none transition-colors hover:bg-gray-700 focus-visible:ring-2 focus-visible:ring-gray-300"
              title="停止生成"
            >
              <Square size={13} fill="currentColor" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleRun}
              disabled={!canRun}
              className={`flex h-12 w-[52px] shrink-0 items-center justify-center outline-none transition-colors focus-visible:ring-2 focus-visible:ring-gray-300 ${
                canRun
                  ? 'bg-[#49b85a] text-white hover:bg-[#3fab50]'
                  : 'cursor-not-allowed bg-gray-200 text-gray-400'
              }`}
              title={canRun ? '执行当前 Prompt' : '修改 Prompt 后可执行'}
            >
              <Play size={18} fill="currentColor" />
            </button>
          )}
        </div>

        {panelCollapsed[0] ? (
          <>
            <div className="min-h-0 flex-1" />
            <BlankFooter />
          </>
        ) : (
          <>
            <textarea
              value={draft}
              onChange={(event) => setDraft(activeKey, event.target.value, originalContent)}
              placeholder="输入消息..."
              readOnly={isStreaming}
              onScroll={inputScrollbar.onScroll}
              className={`scrollbar-auto-hide min-h-0 flex-1 resize-none overflow-y-auto bg-transparent px-5 py-5 text-[15px] leading-7 text-[#2f2f2d] outline-none placeholder:text-gray-300 ${inputScrollbar.className}`}
              spellCheck={false}
            />
            <InputStatsFooter
              model={model}
              content={draft}
              stats={stats}
              useEstimate={dirty || isNewPrompt || !stats?.promptTokens}
            />
          </>
        )}
      </section>

      <ResizeHandle
        divider={0}
        dragging={draggingDivider === 0}
        onPointerDown={handleDividerPointerDown}
        onPointerMove={handleDividerPointerMove}
        onPointerUp={stopDividerDrag}
        onKeyDown={handleDividerKeyDown}
        onDoubleClick={resetPanelWidths}
      />

      <section className="flex min-h-0 min-w-0 flex-col overflow-hidden">
        <div className="flex h-12 shrink-0 items-center border-b border-[#eeeae2] bg-[#fbfaf7]">
          <PanelTitle
            icon={<Brain size={15} />}
            label="思考"
            streaming={isShowingStreaming && Boolean(streamingReasoning)}
          />
        </div>
        {panelCollapsed[1] ? (
          <>
            <div className="min-h-0 flex-1" />
            <BlankFooter />
          </>
        ) : (
          <>
            <div
              onScroll={reasoningScrollbar.onScroll}
              className={`scrollbar-auto-hide min-h-0 flex-1 overflow-y-auto ${reasoningScrollbar.className}`}
            >
              {assistantMessage?.reasoning ? (
                <pre className="whitespace-pre-wrap break-words px-5 py-5 font-sans text-[14px] leading-7 text-gray-600">
                  {assistantMessage.reasoning}
                </pre>
              ) : (
                <EmptyPanel label={isShowingStreaming ? '等待思考内容...' : '暂无思考内容'} />
              )}
            </div>
            <ReasoningStatsFooter model={model} content={assistantMessage?.reasoning ?? ''} stats={stats} />
          </>
        )}
      </section>

      <ResizeHandle
        divider={1}
        dragging={draggingDivider === 1}
        onPointerDown={handleDividerPointerDown}
        onPointerMove={handleDividerPointerMove}
        onPointerUp={stopDividerDrag}
        onKeyDown={handleDividerKeyDown}
        onDoubleClick={resetPanelWidths}
      />

      <section className="flex min-h-0 min-w-0 flex-col overflow-hidden">
        <div className="flex h-12 shrink-0 items-center border-b border-[#eeeae2] bg-[#fbfaf7]">
          <PanelTitle
            icon={<FileOutput size={15} />}
            label="输出"
            streaming={isShowingStreaming && Boolean(streamingContent)}
          />
        </div>
        {panelCollapsed[2] ? (
          <>
            <div className="min-h-0 flex-1" />
            <BlankFooter />
          </>
        ) : (
          <>
            <div
              onScroll={outputScrollbar.onScroll}
              className={`scrollbar-auto-hide min-h-0 flex-1 overflow-y-auto ${outputScrollbar.className}`}
            >
              {assistantMessage?.error && !assistantMessage.content && (
                <ErrorPanel message={assistantMessage} />
              )}
              {assistantMessage?.content ? (
                <div
                  className={`prose max-w-none px-5 py-5 text-[14px] leading-7 text-[#1f1f1d] ${
                    isShowingStreaming ? 'result-streaming' : ''
                  }`}
                >
                  <Markdown content={assistantMessage.content} />
                </div>
              ) : (
                !assistantMessage?.error && (
                  <EmptyPanel label={isShowingStreaming ? '等待输出内容...' : '暂无输出内容'} />
                )
              )}
            </div>
            <OutputStatsFooter model={model} content={assistantMessage?.content ?? ''} stats={stats} />
          </>
        )}
      </section>
    </div>
  );
}
