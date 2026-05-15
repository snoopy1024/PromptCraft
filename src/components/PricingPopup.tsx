import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { MODEL_PRICING, formatCost } from '~/utils/messageStats';

interface CostItem {
  label: string;
  tokens: number;
  pricePerM: number;
  cost: number;
}

interface Props {
  model: string;
  items: CostItem[];
  totalCost: number;
  onClose: () => void;
}

export default function PricingPopup({ model, items, totalCost, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  const pricing = MODEL_PRICING[model];
  const modelName = pricing?.name ?? model;

  return (
    <div
      ref={ref}
      className="absolute bottom-full right-0 z-50 mb-2 w-80 rounded-xl border border-gray-200 bg-white p-4 shadow-lg shadow-black/10"
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-800">{modelName}</span>
        <button
          onClick={onClose}
          className="flex h-5 w-5 items-center justify-center rounded text-gray-400 transition-colors hover:text-gray-600"
        >
          <X size={14} />
        </button>
      </div>

      {pricing && (
        <div className="mb-3 rounded-lg bg-gray-50 p-2.5">
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-gray-400">
            模型价格（每百万 Tokens）
          </p>
          <div className="space-y-1 text-xs text-gray-600">
            <div className="flex justify-between">
              <span>输入（缓存命中）</span>
              <span className="font-medium tabular-nums text-gray-800">¥{pricing.inputCacheHit}</span>
            </div>
            <div className="flex justify-between">
              <span>输入（缓存未命中）</span>
              <span className="font-medium tabular-nums text-gray-800">¥{pricing.inputCacheMiss}</span>
            </div>
            <div className="flex justify-between">
              <span>输出</span>
              <span className="font-medium tabular-nums text-gray-800">¥{pricing.output}</span>
            </div>
          </div>
        </div>
      )}

      <div>
        <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-gray-400">
          费用明细
        </p>
        <div className="space-y-3 text-xs">
          {items.map((item) => (
            <div key={item.label} className="text-gray-600">
              <div className="flex items-baseline justify-between">
                <span>{item.label}</span>
                <span className="font-medium tabular-nums text-gray-800">{formatCost(item.cost)}</span>
              </div>
              <div className="mt-0.5 tabular-nums text-gray-400">
                {item.tokens.toLocaleString()}t × ¥{item.pricePerM}/M
              </div>
            </div>
          ))}
        </div>
        <div className="mt-2 flex items-baseline justify-between border-t border-gray-100 pt-2 text-xs">
          <span className="font-medium text-gray-700">合计</span>
          <span className="text-sm font-semibold tabular-nums text-gray-900">{formatCost(totalCost)}</span>
        </div>
      </div>
    </div>
  );
}
