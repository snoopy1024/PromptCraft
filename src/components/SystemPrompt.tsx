import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useStore } from '~/store';

export default function SystemPrompt() {
  const { currentConversation, setSystemPrompt } = useStore();
  const [expanded, setExpanded] = useState(false);

  if (!currentConversation) return null;

  return (
    <div className="border-b border-gray-100">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-500 transition-colors hover:text-gray-700"
      >
        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        System Prompt
        {currentConversation.systemPrompt && (
          <span className="ml-1 rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-500">
            已设置
          </span>
        )}
      </button>
      {expanded && (
        <div className="px-4 pb-3">
          <textarea
            value={currentConversation.systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="输入 System Prompt，设定模型的行为和角色..."
            rows={4}
            className="w-full resize-y rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:border-gray-400 focus:outline-none"
          />
        </div>
      )}
    </div>
  );
}
