import { Settings2, Lightbulb } from 'lucide-react';
import { useStore } from '~/store';
import ModelSelector from './ModelSelector';
import ParamPanel from './ParamPanel';

export default function Header() {
  const { currentConversation, settingsOpen, setSettingsOpen, setThinkingEnabled } = useStore();

  const thinkingEnabled = currentConversation?.thinkingEnabled ?? true;

  return (
    <div className="border-b border-gray-100">
      <div className="flex items-center gap-3 px-4 py-2.5">
        <ModelSelector />

        <button
          onClick={() => setThinkingEnabled(!thinkingEnabled)}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${
            thinkingEnabled
              ? 'bg-amber-50 text-amber-600 hover:bg-amber-100'
              : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
          }`}
          title={thinkingEnabled ? '思考模式已开启' : '思考模式已关闭'}
        >
          <Lightbulb size={15} />
          思考
        </button>

        <div className="flex-1" />

        <button
          onClick={() => setSettingsOpen(!settingsOpen)}
          className={`rounded-lg p-2 transition-colors ${
            settingsOpen
              ? 'bg-gray-200 text-gray-900'
              : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
          }`}
          title="参数设置"
        >
          <Settings2 size={18} />
        </button>
      </div>
      {settingsOpen && <ParamPanel />}
    </div>
  );
}
