import { useState } from 'react';
import Header from './Header';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import { useChat } from '~/hooks/useChat';
import { useStore } from '~/store';
import TriptychView, { type TriptychUiState } from './TriptychView';
import { getPromptTurns } from '~/utils/conversationTurns';

const INITIAL_TRIPTYCH_UI_STATE: TriptychUiState = {
  selectedByConversation: {},
  draftsByConversation: {},
  panelWidthsByConversation: {},
};

export default function ChatView() {
  const chat = useChat();
  const { chatViewMode, currentConversation, setChatViewMode } = useStore();
  const [triptychUiState, setTriptychUiState] = useState<TriptychUiState>(
    INITIAL_TRIPTYCH_UI_STATE,
  );

  const openTriptychAt = (messageId?: string) => {
    if (currentConversation) {
      const firstTurnKey = getPromptTurns(currentConversation.messages)[0]?.key;
      const selectedKey = messageId ?? firstTurnKey;

      setTriptychUiState((prev) => {
        const nextSelected = { ...prev.selectedByConversation };
        if (selectedKey) {
          nextSelected[currentConversation.id] = selectedKey;
        } else {
          delete nextSelected[currentConversation.id];
        }

        return {
          ...prev,
          selectedByConversation: nextSelected,
        };
      });
    }

    setChatViewMode('triptych');
  };

  return (
    <main className="flex flex-1 flex-col overflow-hidden bg-[#fbfaf7]">
      <Header onOpenTriptych={() => openTriptychAt()} />
      {chatViewMode === 'triptych' ? (
        <TriptychView
          send={chat.send}
          editAndResend={chat.editAndResend}
          stop={chat.stop}
          isStreaming={chat.isStreaming}
          uiState={triptychUiState}
          setUiState={setTriptychUiState}
        />
      ) : (
        <>
          <MessageList
            onRetry={chat.retry}
            onEditSend={chat.editAndResend}
            onOpenTriptych={openTriptychAt}
          />
          <ChatInput send={chat.send} stop={chat.stop} isStreaming={chat.isStreaming} />
        </>
      )}
    </main>
  );
}
