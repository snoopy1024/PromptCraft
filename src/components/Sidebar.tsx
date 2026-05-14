import { Plus, MessageSquare, Trash2, PanelLeftClose, PanelLeft } from 'lucide-react';
import { useStore } from '~/store';

export default function Sidebar() {
  const {
    conversations,
    currentConversation,
    sidebarOpen,
    setSidebarOpen,
    newConversation,
    loadConversation,
    deleteConversation,
  } = useStore();

  if (!sidebarOpen) {
    return (
      <button
        onClick={() => setSidebarOpen(true)}
        className="fixed left-3 top-3 z-50 rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
      >
        <PanelLeft size={20} />
      </button>
    );
  }

  return (
    <aside className="flex h-full w-64 flex-shrink-0 flex-col border-r border-[#eeeae2] bg-[#fbfaf7]">
      <div className="flex items-center justify-between p-3">
        <button
          onClick={newConversation}
          className="flex flex-1 items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-[#efede7] hover:text-gray-900"
        >
          <Plus size={16} />
          新对话
        </button>
        <button
          onClick={() => setSidebarOpen(false)}
          className="ml-2 rounded-lg p-2 text-gray-400 hover:bg-[#efede7] hover:text-gray-600"
        >
          <PanelLeftClose size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {conversations.map((conv) => (
          <div
            key={conv.id}
            className={`group mb-0.5 flex cursor-pointer items-center rounded-lg px-3 py-2.5 text-sm transition-colors ${
              currentConversation?.id === conv.id
                ? 'bg-[#e9e6df] text-gray-900'
                : 'text-gray-600 hover:bg-[#efede7] hover:text-gray-900'
            }`}
            onClick={() => loadConversation(conv.id)}
          >
            <MessageSquare size={14} className="mr-2 flex-shrink-0" />
            <span className="flex-1 truncate">{conv.title}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteConversation(conv.id);
              }}
              className="ml-1 rounded p-1 opacity-0 transition-opacity hover:bg-[#e2ded5] hover:text-red-500 group-hover:opacity-100"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {conversations.length === 0 && (
          <p className="px-3 py-8 text-center text-xs text-gray-400">暂无对话记录</p>
        )}
      </div>
    </aside>
  );
}
