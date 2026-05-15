import type { MessageStats } from '~/store';

export interface ModelPricing {
  name: string;
  inputCacheHit: number;
  inputCacheMiss: number;
  output: number;
}

export const MODEL_PRICING: Record<string, ModelPricing> = {
  'deepseek-v4-flash': {
    name: 'DeepSeek V4 Flash',
    inputCacheHit: 0.02,
    inputCacheMiss: 1,
    output: 2,
  },
  'deepseek-v4-pro': {
    name: 'DeepSeek V4 Pro',
    inputCacheHit: 0.025,
    inputCacheMiss: 3,
    output: 6,
  },
};

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

export function inputCostCny(model: string, tokens: number) {
  const pricing = MODEL_PRICING[model];
  if (!pricing) return 0;
  return (tokens / 1_000_000) * pricing.inputCacheMiss;
}

export function ratePerSecond(tokens: number, durationMs?: number) {
  if (!durationMs || durationMs <= 0) return undefined;
  return tokens / (durationMs / 1000);
}

export function formatDuration(ms?: number) {
  if (!ms || ms <= 0) return '0秒';
  if (ms < 60_000) return `${Math.max(1, Math.round(ms / 1000))}秒`;
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.round((ms % 60_000) / 1000);
  return `${minutes}分${seconds}秒`;
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

export function getUnifiedStatsValues(stats: MessageStats | undefined) {
  const rTokens = stats?.reasoningTokens ?? 0;
  const cTokens = stats?.completionTokens ?? 0;
  const rEst = stats?.reasoningEstimated;
  const cEst = stats?.completionEstimated;

  const rDur = stats?.reasoningDurationMs ?? 0;
  const cDur = stats?.completionDurationMs ?? 0;
  const totalDur = rDur + cDur;

  const totalTokens = rTokens + cTokens;
  const avgSpeed = totalDur > 0 ? totalTokens / (totalDur / 1000) : 0;

  const rCost = stats?.reasoningCostCny ?? 0;
  const cCost = stats?.completionCostCny ?? 0;
  const totalCost = rCost + cCost;

  return {
    reasoningTokens: rTokens > 0 ? `${rEst ? '~' : ''}${rTokens}t` : null,
    completionTokens: `${cEst ? '~' : ''}${cTokens}t`,
    speed: `${Math.round(avgSpeed)}t/s`,
    cost: formatCost(totalCost),
    duration: formatDuration(totalDur),
  };
}

export function formatStatsLine(
  stats: MessageStats | undefined,
  type: 'completion' | 'reasoning',
) {
  const values = getStatsValues(stats, type);
  return `${values.tokens}     ${values.speed}     ${values.duration}     ${values.cost}`;
}
