import { useState } from 'react';
import { Brain, MessageSquareText, Gauge, Clock } from 'lucide-react';
import type { MessageStats } from '~/store';
import { getStatsValues, getUnifiedStatsValues, MODEL_PRICING } from '~/utils/messageStats';
import PricingPopup from './PricingPopup';

interface Props {
  stats?: MessageStats;
  model?: string;
  type: 'completion' | 'reasoning' | 'unified';
}

function Stat({ icon, value, title }: { icon: React.ReactNode; value: string; title: string }) {
  return (
    <span className="inline-flex items-center gap-1" title={title}>
      {icon}
      {value}
    </span>
  );
}

const ICON_SIZE = 13;

function buildCostItems(stats: MessageStats | undefined, model: string) {
  const pricing = MODEL_PRICING[model];
  const outputPrice = pricing?.output ?? 0;
  const rTokens = stats?.reasoningTokens ?? 0;
  const cTokens = stats?.completionTokens ?? 0;
  const cacheHit = stats?.promptCacheHitTokens ?? 0;
  const cacheMiss = stats?.promptCacheMissTokens ?? 0;

  const items = [];

  if (stats?.promptTokens !== undefined) {
    if (cacheHit > 0) {
      items.push({
        label: '输入（缓存命中）',
        tokens: cacheHit,
        pricePerM: pricing?.inputCacheHit ?? 0,
        cost: (cacheHit / 1_000_000) * (pricing?.inputCacheHit ?? 0),
      });
    }
    items.push({
      label: '输入（缓存未命中）',
      tokens: cacheMiss,
      pricePerM: pricing?.inputCacheMiss ?? 0,
      cost: (cacheMiss / 1_000_000) * (pricing?.inputCacheMiss ?? 0),
    });
  }

  if (rTokens > 0) {
    items.push({
      label: '思考',
      tokens: rTokens,
      pricePerM: outputPrice,
      cost: (rTokens / 1_000_000) * outputPrice,
    });
  }
  items.push({
    label: '输出',
    tokens: cTokens,
    pricePerM: outputPrice,
    cost: (cTokens / 1_000_000) * outputPrice,
  });
  return items;
}

export default function StatsLine({ stats, model, type }: Props) {
  const [showPricing, setShowPricing] = useState(false);

  if (type === 'unified') {
    const v = getUnifiedStatsValues(stats);
    const costItems = model ? buildCostItems(stats, model) : [];
    const totalCost = costItems.reduce((sum, i) => sum + i.cost, 0);

    return (
      <span className="flex flex-wrap items-center gap-x-4 whitespace-nowrap leading-5 tabular-nums">
        {v.reasoningTokens && (
          <Stat icon={<Brain size={ICON_SIZE} />} value={v.reasoningTokens} title="思考 Tokens" />
        )}
        <Stat icon={<MessageSquareText size={ICON_SIZE} />} value={v.completionTokens} title="输出 Tokens" />
        <Stat icon={<Gauge size={ICON_SIZE} />} value={v.speed} title="平均速度" />
        <span className="relative">
          <button
            type="button"
            onClick={() => setShowPricing(true)}
            className="inline-flex items-center gap-1 rounded transition-colors hover:text-gray-600"
            title="查看费用明细"
          >
            {v.cost}
          </button>
          {showPricing && model && (
            <PricingPopup
              model={model}
              items={costItems}
              totalCost={totalCost}
              onClose={() => setShowPricing(false)}
            />
          )}
        </span>
        <Stat icon={<Clock size={ICON_SIZE} />} value={v.duration} title="持续时长" />
      </span>
    );
  }

  const values = getStatsValues(stats, type);

  return (
    <span className="grid grid-cols-[minmax(4.5rem,auto)_minmax(6.75rem,auto)_minmax(4.5rem,auto)_minmax(2.25rem,auto)] items-center gap-x-[2px] whitespace-nowrap text-right leading-5 tabular-nums">
      <span>{values.tokens}</span>
      <span>{values.speed}</span>
      <span>{values.cost}</span>
      <span>{values.duration}</span>
    </span>
  );
}
