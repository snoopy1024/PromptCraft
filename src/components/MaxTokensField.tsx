import { useState } from 'react';

const MAX_TOKENS_LIMIT = 393216; // 384K
const MIN_TOKENS = 1;

const PRESETS = [
  { label: '1K', value: 1024 },
  { label: '4K', value: 4096 },
  { label: '8K', value: 8192 },
  { label: '16K', value: 16384 },
  { label: '32K', value: 32768 },
  { label: '64K', value: 65536 },
  { label: '128K', value: 131072 },
  { label: '384K', value: 393216 },
];

interface Props {
  value: number;
  disabled?: boolean;
  onChange: (v: number) => void;
  compact?: boolean;
}

export default function MaxTokensField({ value, disabled, onChange, compact }: Props) {
  const [inputValue, setInputValue] = useState(String(value));

  const clamp = (v: number) => Math.min(Math.max(v, MIN_TOKENS), MAX_TOKENS_LIMIT);

  const handleInputChange = (raw: string) => {
    setInputValue(raw);
    const n = parseInt(raw, 10);
    if (Number.isFinite(n) && n >= MIN_TOKENS) {
      onChange(clamp(n));
    }
  };

  const handleInputBlur = () => {
    setInputValue(String(value));
  };

  const isActive = (preset: number) => value === preset;

  if (compact) {
    return (
      <div className={`flex flex-col gap-4 ${disabled ? 'opacity-35' : ''}`}>
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-gray-500">Max Tokens</label>
          <input
            type="number"
            value={inputValue}
            min={MIN_TOKENS}
            max={MAX_TOKENS_LIMIT}
            step={1}
            disabled={disabled}
            onChange={(e) => handleInputChange(e.target.value)}
            onBlur={handleInputBlur}
            onFocus={() => setInputValue(String(value))}
            className="w-20 rounded-md border border-gray-200 bg-white px-2 py-1 text-right text-xs text-gray-700 focus:border-gray-400 focus:outline-none disabled:cursor-not-allowed"
          />
        </div>
        <div className="flex justify-between">
          {PRESETS.map((p) => (
            <button
              key={p.value}
              type="button"
              disabled={disabled}
              onClick={() => { onChange(p.value); setInputValue(String(p.value)); }}
              className={`rounded px-1.5 py-0.5 text-[11px] font-medium transition-colors disabled:cursor-not-allowed ${
                isActive(p.value)
                  ? 'bg-gray-800 text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${disabled ? 'opacity-40' : ''}`}>
      <div className="flex items-center justify-between gap-3">
        <label className="text-xs font-medium text-gray-500">Max Tokens</label>
        <input
          type="number"
          value={inputValue}
          min={MIN_TOKENS}
          max={MAX_TOKENS_LIMIT}
          step={1}
          disabled={disabled}
          onChange={(e) => handleInputChange(e.target.value)}
          onBlur={handleInputBlur}
          onFocus={() => setInputValue(String(value))}
          className="h-7 w-24 rounded-md border border-gray-200 bg-white px-2 text-right text-xs text-gray-700 outline-none transition-colors focus:border-gray-400 disabled:cursor-not-allowed"
        />
      </div>
      <div className="flex justify-between">
        {PRESETS.map((p) => (
          <button
            key={p.value}
            type="button"
            disabled={disabled}
            onClick={() => { onChange(p.value); setInputValue(String(p.value)); }}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed ${
              isActive(p.value)
                ? 'bg-gray-800 text-white'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
