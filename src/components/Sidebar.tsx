import { useEffect, useRef, useState } from 'react';
import { PlusCircle, MessageSquare, Pencil, Trash2, PanelLeftClose, PanelLeft, Plus } from 'lucide-react';
import { useStore } from '~/store';

interface ContextMenu {
  convId: string;
  x: number;
  y: number;
}

export default function Sidebar() {
  const {
    conversations,
    currentConversation,
    sidebarOpen,
    setSidebarOpen,
    newConversation,
    loadConversation,
    renameConversation,
    deleteConversation,
  } = useStore();

  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!contextMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [contextMenu]);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  const handleContextMenu = (e: React.MouseEvent, convId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ convId, x: e.clientX, y: e.clientY });
  };

  const startRename = (convId: string) => {
    const conv = conversations.find((c) => c.id === convId);
    if (!conv) return;
    setEditingId(convId);
    setEditingTitle(conv.title);
    setContextMenu(null);
  };

  const commitRename = () => {
    if (editingId && editingTitle.trim()) {
      const conv = conversations.find((c) => c.id === editingId);
      if (conv && conv.title !== editingTitle.trim()) {
        renameConversation(editingId, editingTitle.trim());
      }
    }
    setEditingId(null);
    setEditingTitle('');
  };

  const startDelete = (convId: string) => {
    setPendingDeleteId(convId);
    setContextMenu(null);
  };

  if (!sidebarOpen) {
    return (
      <div className="fixed left-3 top-3 z-50 flex flex-col gap-3">
        <button
          onClick={() => setSidebarOpen(true)}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          title="展开侧边栏"
        >
          <PanelLeft size={20} />
        </button>
        <button
          onClick={newConversation}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          title="新对话"
        >
          <PlusCircle size={20} strokeWidth={2.25} />
        </button>
      </div>
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
            onClick={() => editingId !== conv.id && loadConversation(conv.id)}
            onContextMenu={(e) => handleContextMenu(e, conv.id)}
          >
            <MessageSquare size={14} className="mr-2 flex-shrink-0" />
            {editingId === conv.id ? (
              <input
                ref={editInputRef}
                value={editingTitle}
                onChange={(e) => setEditingTitle(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitRename();
                  if (e.key === 'Escape') {
                    setEditingId(null);
                    setEditingTitle('');
                  }
                }}
                className="flex-1 rounded border border-[#d5d1c8] bg-white px-1.5 py-0.5 text-sm text-gray-900 outline-none focus:border-[#b5b0a5]"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="flex-1 truncate">{conv.title}</span>
            )}
          </div>
        ))}
        {conversations.length === 0 && (
          <p className="px-3 py-8 text-center text-xs text-gray-400">暂无对话记录</p>
        )}
      </div>

      {contextMenu && (
        <div
          ref={menuRef}
          className="fixed z-50 min-w-[140px] rounded-lg border border-[#e5e1d8] bg-white py-1 shadow-lg"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-[#f5f3ee]"
            onClick={() => startRename(contextMenu.convId)}
          >
            <Pencil size={14} />
            修改标题
          </button>
          <button
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-[#f5f3ee]"
            onClick={() => startDelete(contextMenu.convId)}
          >
            <Trash2 size={14} />
            删除对话
          </button>
        </div>
      )}

      {pendingDeleteId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setPendingDeleteId(null)}
        >
          <div
            className="mx-4 w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-gray-900">确认删除</h3>
            <p className="mt-2 text-sm text-gray-500">
              此操作会永久删除本地的对话记录，且无法恢复。确定要删除吗？
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setPendingDeleteId(null)}
                className="rounded-lg px-4 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-100"
              >
                取消
              </button>
              <button
                onClick={() => {
                  deleteConversation(pendingDeleteId);
                  setPendingDeleteId(null);
                }}
                className="rounded-lg bg-red-500 px-4 py-2 text-sm text-white transition-colors hover:bg-red-600"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
