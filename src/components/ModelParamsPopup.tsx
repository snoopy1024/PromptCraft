import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import type { MessageStats } from '~/store';
import { MODELS } from './ModelSelector';
import deepSeekIcon from '~/assets/deepseek.png';

interface Props {
  stats: MessageStats;
  onClose: () => void;
}

const THINKING_LABELS: Record<string, string> = {
  enabled: '开启',
  disabled: '关闭',
};

const EFFORT_LABELS: Record<string, string> = {
  high: 'HIGH',
  max: 'MAX',
};

export default function ModelParamsPopup({ stats, onClose }: Props) {
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

  const params = stats.requestParams;
  if (!params) return null;

  const modelId = params.model as string | undefined;
  const modelInfo = modelId ? MODELS.find((m) => m.id === modelId) : undefined;
  const modelName = modelInfo?.name ?? modelId ?? '未知';

  const thinking = params.thinking as { type?: string } | undefined;
  const thinkingType = thinking?.type;
  const thinkingLabel = thinkingType ? (THINKING_LABELS[thinkingType] ?? thinkingType) : undefined;

  const effort = params.reasoning_effort as string | undefined;
  const effortLabel = effort ? (EFFORT_LABELS[effort] ?? effort) : undefined;

  const maxTokens = params.max_tokens as number | undefined;
  const temperature = params.temperature as number | undefined;
  const topP = params.top_p as number | undefined;

  return (
    <div
      ref={ref}
      className="absolute bottom-full right-0 z-50 mb-2 w-72 rounded-xl border border-gray-200 bg-white p-4 shadow-lg shadow-black/10"
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-800">请求参数</span>
        <button
          onClick={onClose}
          className="flex h-5 w-5 items-center justify-center rounded text-gray-400 transition-colors hover:text-gray-600"
        >
          <X size={14} />
        </button>
      </div>

      <div className="mb-3 flex items-center gap-2.5 rounded-lg bg-gray-50 px-3 py-2.5">
        <img
          src={deepSeekIcon}
          alt=""
          className="h-5 w-5 rounded-full object-contain"
          draggable={false}
        />
        <span className="text-sm font-medium text-gray-800">{modelName}</span>
      </div>

      <div className="space-y-2 text-xs text-gray-600">
        {thinkingLabel && (
          <Row label="思考模式" value={effortLabel ? `${thinkingLabel}（${effortLabel}）` : thinkingLabel} />
        )}
        {maxTokens != null && (
          <Row label="Max Tokens" value={maxTokens.toLocaleString()} />
        )}
        {temperature != null && (
          <Row label="Temperature" value={String(temperature)} />
        )}
        {topP != null && (
          <Row label="Top P" value={String(topP)} />
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium tabular-nums text-gray-800">{value}</span>
    </div>
  );
}
