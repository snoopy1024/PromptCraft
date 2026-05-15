import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { useStore, type ThinkingLevel } from '~/store';
import deepSeekIcon from '~/assets/deepseek.png';
import MaxTokensField from './MaxTokensField';

const MODELS = [
  {
    id: 'deepseek-v4-flash',
    name: 'DeepSeek V4-Flash',
    shortName: 'V4-Flash',
    description: '高性价比，支持思考/非思考模式切换',
  },
  {
    id: 'deepseek-v4-pro',
    name: 'DeepSeek V4-Pro',
    shortName: 'V4-Pro',
    description: '旗舰模型，更强推理能力',
  },
];

const THINKING_OPTIONS: Array<{ value: ThinkingLevel; label: string }> = [
  { value: 'off', label: '关闭' },
  { value: 'high', label: 'HIGH' },
  { value: 'max', label: 'MAX' },
];

interface SliderFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function SliderField({ label, value, min, max, step, disabled, onChange }: SliderFieldProps) {
  const handleNumberChange = (raw: string) => {
    const next = Number(raw);
    if (!Number.isFinite(next)) return;
    onChange(clamp(next, min, max));
  };

  return (
    <div className={`space-y-2 ${disabled ? 'opacity-40' : ''}`}>
      <div className="flex items-center justify-between gap-3">
        <label className="text-xs font-medium text-gray-500">{label}</label>
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          onChange={(event) => handleNumberChange(event.target.value)}
          className="h-7 w-20 rounded-md border border-gray-200 bg-white px-2 text-right text-xs text-gray-700 outline-none transition-colors focus:border-gray-400 disabled:cursor-not-allowed"
        />
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-gray-200 accent-gray-800 disabled:cursor-not-allowed"
      />
    </div>
  );
}

export default function ChatSettingsPopover() {
  const {
    currentConversation,
    setModel,
    setParams,
    setSystemPrompt,
    setThinkingLevel,
  } = useStore();
  const [open, setOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const selected = MODELS.find((model) => model.id === currentConversation?.model) ?? MODELS[0];
  const thinkingLevel = currentConversation?.thinkingLevel ?? 'high';
  const thinkingLabel =
    THINKING_OPTIONS.find((option) => option.value === thinkingLevel)?.label ?? 'HIGH';
  const thinkingEnabled = thinkingLevel !== 'off';

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (open) {
      scrollRef.current?.scrollTo({ top: 0 });
    }
  }, [open]);

  if (!currentConversation) return null;

  const { params } = currentConversation;

  return (
    <div ref={ref} className="relative min-w-0">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex min-w-0 max-w-full items-center gap-1.5 rounded-full border border-transparent px-2.5 py-1.5 text-sm text-gray-600 outline-none transition-colors hover:border-gray-200 hover:bg-gray-50 hover:text-gray-900 focus-visible:ring-2 focus-visible:ring-gray-300"
        title="模型与参数"
      >
        <span className="truncate font-medium">{selected.shortName}</span>
        <span className="hidden shrink-0 pl-1 text-gray-400 sm:inline">{thinkingLabel}</span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          className="absolute bottom-full right-0 z-50 mb-3 w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl shadow-gray-900/10 sm:w-[440px]"
          style={{ maxHeight: 'min(72vh, 640px)' }}
        >
          <div
            ref={scrollRef}
            className="scrollbar-hidden overflow-y-auto"
            style={{ maxHeight: 'calc(min(72vh, 640px) - 2rem)' }}
          >
            <div className="pb-3">
              <p className="text-sm font-semibold text-gray-900">模型与参数</p>
            </div>

            <div className="space-y-5">
              <section className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">模型</p>
                <div className="space-y-1">
                  {MODELS.map((model) => (
                    <button
                      key={model.id}
                      type="button"
                      onClick={() => setModel(model.id)}
                      className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                        model.id === selected.id
                          ? 'bg-[#0385FF]/10 text-gray-900'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/80 ring-1 ring-[#0385FF]/15">
                          <img
                            src={deepSeekIcon}
                            alt=""
                            className="h-6 w-6 rounded-full object-contain"
                            draggable={false}
                          />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-medium">{model.name}</span>
                          <span className="mt-0.5 block text-xs leading-5 text-gray-400">
                            {model.description}
                          </span>
                        </span>
                      </span>
                      {model.id === selected.id && (
                        <Check size={16} className="shrink-0 text-[#0385FF]" />
                      )}
                    </button>
                  ))}
                </div>
              </section>

              <section className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">思考</p>
                <div className="grid grid-cols-3 gap-1 rounded-xl bg-gray-50 p-1" role="tablist">
                  {THINKING_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      role="tab"
                      aria-selected={thinkingLevel === option.value}
                      onClick={() => setThinkingLevel(option.value)}
                      className={`rounded-lg px-3 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#0385FF]/30 ${
                        thinkingLevel === option.value
                          ? 'bg-[#0385FF] text-white shadow-sm shadow-[#0385FF]/20'
                          : 'text-gray-500 hover:bg-white hover:text-gray-900'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </section>

              <section className="space-y-4">
                <button
                  type="button"
                  aria-expanded={advancedOpen}
                  onClick={() => setAdvancedOpen((value) => !value)}
                  className="mx-auto flex h-9 w-9 items-center justify-center rounded-full text-gray-400 outline-none transition-colors hover:bg-gray-50 hover:text-gray-700 focus-visible:ring-2 focus-visible:ring-gray-300"
                  title={advancedOpen ? '收起参数' : '展开参数'}
                >
                  <ChevronDown
                    size={18}
                    className={`transition-transform ${advancedOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {advancedOpen && (
                  <div className="space-y-7">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                          参数
                        </p>
                        {thinkingEnabled && (
                          <span className="text-xs text-amber-600">采样参数已锁定</span>
                        )}
                      </div>
                      <SliderField
                        label="Temperature"
                        value={params.temperature}
                        min={0}
                        max={2}
                        step={0.1}
                        disabled={thinkingEnabled}
                        onChange={(value) => setParams({ temperature: value })}
                      />
                      <SliderField
                        label="Top P"
                        value={params.top_p}
                        min={0}
                        max={1}
                        step={0.05}
                        disabled={thinkingEnabled}
                        onChange={(value) => setParams({ top_p: value })}
                      />
                      <MaxTokensField
                        value={params.max_tokens}
                        onChange={(value) => setParams({ max_tokens: value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                        System Prompt
                      </p>
                      <textarea
                        value={currentConversation.systemPrompt}
                        onChange={(event) => setSystemPrompt(event.target.value)}
                        placeholder="设定模型的行为和角色..."
                        rows={4}
                        className="w-full resize-y rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm leading-6 text-gray-800 outline-none transition-colors placeholder:text-gray-400 focus:border-gray-400"
                      />
                    </div>
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
