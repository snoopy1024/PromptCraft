import Header from './Header';
import SystemPrompt from './SystemPrompt';
import MessageList from './MessageList';
import ChatInput from './ChatInput';

export default function ChatView() {
  return (
    <main className="flex flex-1 flex-col overflow-hidden">
      <Header />
      <SystemPrompt />
      <MessageList />
      <ChatInput />
    </main>
  );
}
