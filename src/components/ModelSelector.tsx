import { ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useStore } from '~/store';

const MODELS = [
  { id: 'deepseek-v4-flash', name: 'DeepSeek V4-Flash', description: '高性价比，支持思考/非思考模式切换' },
  { id: 'deepseek-v4-pro', name: 'DeepSeek V4-Pro', description: '旗舰模型，更强推理能力' },
];

export default function ModelSelector() {
  const { currentConversation, setModel } = useStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = MODELS.find((m) => m.id === currentConversation?.model) || MODELS[0];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-xl border border-gray-200 px-3.5 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50"
      >
        {selected.name}
        <ChevronDown size={14} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-72 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
          {MODELS.map((model) => (
            <button
              key={model.id}
              className={`flex w-full flex-col px-4 py-3 text-left transition-colors hover:bg-gray-50 ${
                model.id === selected.id ? 'bg-gray-50' : ''
              }`}
              onClick={() => {
                setModel(model.id);
                setOpen(false);
              }}
            >
              <span className="text-sm font-medium text-gray-800">{model.name}</span>
              <span className="mt-0.5 text-xs text-gray-400">{model.description}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
