import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface Props {
  estimatedTokens: number;
  promptTokens?: number;
  cacheHitTokens?: number;
  cacheMissTokens?: number;
  onClose: () => void;
}

export default function TokenDetailPopup({
  estimatedTokens,
  promptTokens,
  cacheHitTokens,
  cacheMissTokens,
  onClose,
}: Props) {
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

  const hasApiData = promptTokens !== undefined;
  const cacheHitPct =
    hasApiData && promptTokens! > 0 && cacheHitTokens
      ? Math.round((cacheHitTokens / promptTokens!) * 100)
      : undefined;

  return (
    <div
      ref={ref}
      className="absolute bottom-full right-0 z-50 mb-2 w-64 rounded-xl border border-gray-200 bg-white p-4 shadow-lg shadow-black/10"
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-800">Token 详情</span>
        <button
          onClick={onClose}
          className="flex h-5 w-5 items-center justify-center rounded text-gray-400 transition-colors hover:text-gray-600"
        >
          <X size={14} />
        </button>
      </div>

      <div className="space-y-2 text-xs">
        <div className="flex justify-between text-gray-600">
          <span>本条 Prompt</span>
          <span className="tabular-nums font-medium text-gray-800">{estimatedTokens.toLocaleString()}t</span>
        </div>

        {hasApiData && (
          <>
            <div className="border-t border-gray-100 pt-2" />
            <div className="flex justify-between text-gray-600">
              <span>上下文总输入</span>
              <span className="tabular-nums font-medium text-gray-800">{promptTokens!.toLocaleString()}t</span>
            </div>
            {cacheHitTokens !== undefined && cacheHitTokens > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>
                  缓存命中
                  {cacheHitPct !== undefined && (
                    <span className="ml-1 text-emerald-500">({cacheHitPct}%)</span>
                  )}
                </span>
                <span className="tabular-nums font-medium text-emerald-600">{cacheHitTokens.toLocaleString()}t</span>
              </div>
            )}
            {cacheMissTokens !== undefined && cacheMissTokens > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>缓存未命中</span>
                <span className="tabular-nums font-medium text-gray-800">{cacheMissTokens.toLocaleString()}t</span>
              </div>
            )}
          </>
        )}

        {!hasApiData && (
          <p className="text-[11px] text-gray-400">API 数据将在响应完成后显示</p>
        )}
      </div>
    </div>
  );
}
