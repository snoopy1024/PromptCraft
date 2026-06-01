import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Columns3, MessageSquareText } from 'lucide-react';
import { useStore } from '~/store';

interface Props {
  onOpenTriptych?: () => void;
}

export default function Header({ onOpenTriptych }: Props) {
  const {
    currentConversation,
    chatViewMode,
    setChatViewMode,
    setTitle,
    saveConversation,
  } = useStore();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const title = currentConversation?.title || '新对话';
  const canEditTitle = (currentConversation?.messages.length ?? 0) > 0;
  const inputWidth = `${Math.min(Math.max(draft.length || title.length, 3), 34) + 1}em`;

  useEffect(() => {
    if (!editing) {
      setDraft(title);
    }
  }, [editing, title]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const commitTitle = () => {
    if (!canEditTitle) {
      setEditing(false);
      return;
    }

    const nextTitle = draft.trim() || '新对话';
    setTitle(nextTitle);
    setEditing(false);
    if (currentConversation && nextTitle !== currentConversation.title) {
      void saveConversation();
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      commitTitle();
    }

    if (event.key === 'Escape') {
      setDraft(title);
      setEditing(false);
    }
  };

  return (
    <header className="flex h-[60px] shrink-0 items-center justify-between gap-4 border-b border-transparent bg-[#fbfaf7] px-4">
      <div className="flex min-w-0 items-center">
        {editing && canEditTitle ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commitTitle}
            onKeyDown={handleKeyDown}
            style={{ width: inputWidth, maxWidth: 'min(34rem, calc(100vw - 5rem))' }}
            className="h-9 min-w-16 rounded-lg border border-blue-500 bg-blue-50 px-2 text-sm font-medium leading-9 text-[#1f2933] outline-none ring-2 ring-blue-100"
          />
        ) : canEditTitle ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex h-9 max-w-[min(34rem,calc(100vw-5rem))] items-center truncate rounded-lg px-2 text-left text-sm font-medium leading-none text-[#2f2f2d] outline-none transition-colors hover:bg-black/[0.03] focus-visible:ring-2 focus-visible:ring-gray-300"
            title="修改标题"
          >
            {title}
          </button>
        ) : (
          <span className="flex h-9 max-w-[min(34rem,calc(100vw-5rem))] items-center truncate px-2 text-left text-sm font-medium leading-none text-[#2f2f2d]">
            新对话
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={() => {
          if (chatViewMode === 'triptych') {
            setChatViewMode('dialogue');
          } else {
            onOpenTriptych?.();
          }
        }}
        className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-[#2f2f2d] outline-none transition-colors hover:bg-black/[0.03] focus-visible:ring-2 focus-visible:ring-gray-300"
        title={chatViewMode === 'triptych' ? '切换到对话式' : '切换到三段式'}
      >
        {chatViewMode === 'triptych' ? (
          <>
            <MessageSquareText size={18} />
            对话式
          </>
        ) : (
          <>
            <Columns3 size={18} />
            三段式
          </>
        )}
      </button>
    </header>
  );
}
