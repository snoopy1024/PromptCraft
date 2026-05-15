import { useStore } from '~/store';

interface SliderFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  disabled?: boolean;
  onChange: (v: number) => void;
}

function SliderField({ label, value, min, max, step, disabled, onChange }: SliderFieldProps) {
  return (
    <div className={`flex flex-col gap-1.5 ${disabled ? 'opacity-35' : ''}`}>
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-gray-500">{label}</label>
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="w-20 rounded-md border border-gray-200 bg-white px-2 py-1 text-right text-xs text-gray-700 focus:border-gray-400 focus:outline-none disabled:cursor-not-allowed"
        />
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-gray-200 accent-gray-800 disabled:cursor-not-allowed"
      />
    </div>
  );
}

export default function ParamPanel() {
  const { currentConversation, setParams } = useStore();
  if (!currentConversation) return null;

  const { params } = currentConversation;
  const thinkingEnabled = currentConversation.thinkingLevel !== 'off';

  return (
    <div className="border-t border-gray-100 px-4 pb-3 pt-2">
      {thinkingEnabled && (
        <p className="mb-2 text-xs text-amber-500">
          思考模式下 temperature / top_p 参数不生效
        </p>
      )}
      <div className="grid grid-cols-2 gap-x-8 gap-y-3 lg:grid-cols-3">
        <SliderField
          label="Temperature"
          value={params.temperature}
          min={0}
          max={2}
          step={0.1}
          disabled={thinkingEnabled}
          onChange={(v) => setParams({ temperature: v })}
        />
        <SliderField
          label="Top P"
          value={params.top_p}
          min={0}
          max={1}
          step={0.05}
          disabled={thinkingEnabled}
          onChange={(v) => setParams({ top_p: v })}
        />
        <SliderField
          label="Max Tokens"
          value={params.max_tokens}
          min={256}
          max={65536}
          step={256}
          onChange={(v) => setParams({ max_tokens: v })}
        />
      </div>
    </div>
  );
}
