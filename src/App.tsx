import { useEffect } from 'react';
import { useStore } from '~/store';
import Sidebar from '~/components/Sidebar';
import ChatView from '~/components/ChatView';

export default function App() {
  const loadConversationList = useStore((s) => s.loadConversationList);

  useEffect(() => {
    loadConversationList();
  }, [loadConversationList]);

  return (
    <div className="flex h-full bg-[#fbfaf7] text-gray-900">
      <Sidebar />
      <ChatView />
    </div>
  );
}
