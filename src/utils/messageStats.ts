import type { MessageStats } from '~/store';

const OUTPUT_PRICE_CNY_PER_M_TOKEN: Record<string, number> = {
  'deepseek-v4-flash': 2,
  'deepseek-v4-pro': 6,
};

export function estimateTokens(text: string) {
  if (!text.trim()) return 0;

  const cjkCount = text.match(/[\u3400-\u9fff]/g)?.length ?? 0;
  const latinTokenCount = text.match(/[A-Za-z0-9_]+|[^\sA-Za-z0-9_\u3400-\u9fff]/g)?.length ?? 0;

  return Math.max(1, Math.round(cjkCount + latinTokenCount * 0.75));
}

export function outputCostCny(model: string, tokens: number) {
  const price = OUTPUT_PRICE_CNY_PER_M_TOKEN[model] ?? 0;
  return (tokens / 1_000_000) * price;
}

export function ratePerSecond(tokens: number, durationMs?: number) {
  if (!durationMs || durationMs <= 0) return undefined;
  return tokens / (durationMs / 1000);
}

export function formatDuration(ms?: number) {
  if (!ms || ms <= 0) return '0 秒';
  if (ms < 60_000) return `${Math.max(1, Math.round(ms / 1000))} 秒`;
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.round((ms % 60_000) / 1000);
  return `${minutes} 分 ${seconds} 秒`;
}

export function formatCost(cost?: number) {
  if (cost === undefined) return '¥0.00000';
  if (cost === 0) return '¥0.00000';
  return `¥${cost.toFixed(cost < 0.01 ? 5 : 4)}`;
}

export function getStatsValues(
  stats: MessageStats | undefined,
  type: 'completion' | 'reasoning',
) {
  const tokens =
    type === 'completion' ? stats?.completionTokens ?? 0 : stats?.reasoningTokens ?? 0;
  const estimated =
    type === 'completion' ? stats?.completionEstimated : stats?.reasoningEstimated;
  const duration =
    type === 'completion' ? stats?.completionDurationMs : stats?.reasoningDurationMs;
  const speed =
    type === 'completion' ? stats?.completionTokensPerSecond : stats?.reasoningTokensPerSecond;
  const cost =
    type === 'completion' ? stats?.completionCostCny : stats?.reasoningCostCny;

  return {
    tokens: `${estimated ? '约' : ''}${tokens} Tokens`,
    speed: `${Math.round(speed ?? 0)} Tokens / 秒`,
    duration: formatDuration(duration),
    cost: formatCost(cost),
  };
}

export function formatStatsLine(
  stats: MessageStats | undefined,
  type: 'completion' | 'reasoning',
) {
  const values = getStatsValues(stats, type);
  return `${values.tokens}     ${values.speed}     ${values.duration}     ${values.cost}`;
}
