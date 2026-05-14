import Header from './Header';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import { useChat } from '~/hooks/useChat';

export default function ChatView() {
  const chat = useChat();

  return (
    <main className="flex flex-1 flex-col overflow-hidden bg-[#fbfaf7]">
      <Header />
      <MessageList onRetry={chat.retry} />
      <ChatInput send={chat.send} stop={chat.stop} isStreaming={chat.isStreaming} />
    </main>
  );
}
