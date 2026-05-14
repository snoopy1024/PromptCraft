import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  reasoning?: string;
}

export interface Conversation {
  id: string;
  title: string;
  model: string;
  systemPrompt: string;
  thinkingEnabled: boolean;
  params: ModelParams;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

export interface ModelParams {
  temperature: number;
  top_p: number;
  max_tokens: number;
  frequency_penalty: number;
  presence_penalty: number;
}

export interface ConversationSummary {
  id: string;
  title: string;
  model: string;
  createdAt: string;
  updatedAt: string;
}

const DEFAULT_PARAMS: ModelParams = {
  temperature: 1.0,
  top_p: 1.0,
  max_tokens: 4096,
  frequency_penalty: 0,
  presence_penalty: 0,
};

function createNewConversation(): Conversation {
  return {
    id: uuidv4(),
    title: '新对话',
    model: 'deepseek-v4-flash',
    systemPrompt: '',
    thinkingEnabled: true,
    params: { ...DEFAULT_PARAMS },
    messages: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

interface AppState {
  conversations: ConversationSummary[];
  currentConversation: Conversation | null;
  isStreaming: boolean;
  streamingContent: string;
  streamingReasoning: string;
  sidebarOpen: boolean;
  settingsOpen: boolean;

  setSidebarOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setModel: (model: string) => void;
  setSystemPrompt: (prompt: string) => void;
  setThinkingEnabled: (enabled: boolean) => void;
  setParams: (params: Partial<ModelParams>) => void;
  setStreaming: (streaming: boolean) => void;
  appendStreamContent: (content: string) => void;
  appendStreamReasoning: (reasoning: string) => void;
  resetStream: () => void;

  newConversation: () => void;
  loadConversationList: () => Promise<void>;
  loadConversation: (id: string) => Promise<void>;
  saveConversation: () => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;

  addUserMessage: (content: string) => void;
  finalizeAssistantMessage: (content: string, reasoning?: string) => void;
}

export const useStore = create<AppState>((set, get) => ({
  conversations: [],
  currentConversation: createNewConversation(),
  isStreaming: false,
  streamingContent: '',
  streamingReasoning: '',
  sidebarOpen: true,
  settingsOpen: false,

  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setSettingsOpen: (open) => set({ settingsOpen: open }),

  setModel: (model) =>
    set((s) => ({
      currentConversation: s.currentConversation
        ? { ...s.currentConversation, model }
        : null,
    })),

  setSystemPrompt: (prompt) =>
    set((s) => ({
      currentConversation: s.currentConversation
        ? { ...s.currentConversation, systemPrompt: prompt }
        : null,
    })),

  setThinkingEnabled: (enabled) =>
    set((s) => ({
      currentConversation: s.currentConversation
        ? { ...s.currentConversation, thinkingEnabled: enabled }
        : null,
    })),

  setParams: (params) =>
    set((s) => ({
      currentConversation: s.currentConversation
        ? {
            ...s.currentConversation,
            params: { ...s.currentConversation.params, ...params },
          }
        : null,
    })),

  setStreaming: (streaming) => set({ isStreaming: streaming }),
  appendStreamContent: (content) =>
    set((s) => ({ streamingContent: s.streamingContent + content })),
  appendStreamReasoning: (reasoning) =>
    set((s) => ({ streamingReasoning: s.streamingReasoning + reasoning })),
  resetStream: () => set({ streamingContent: '', streamingReasoning: '' }),

  newConversation: () => set({ currentConversation: createNewConversation() }),

  loadConversationList: async () => {
    const res = await fetch('/api/conversations');
    const data = await res.json();
    set({ conversations: data });
  },

  loadConversation: async (id) => {
    const res = await fetch(`/api/conversations/${id}`);
    if (res.ok) {
      const data = await res.json();
      set({ currentConversation: data });
    }
  },

  saveConversation: async () => {
    const conv = get().currentConversation;
    if (!conv || conv.messages.length === 0) return;
    const toSave = { ...conv, updatedAt: new Date().toISOString() };
    if (toSave.title === '新对话' && toSave.messages.length > 0) {
      const firstMsg = toSave.messages[0].content;
      toSave.title = firstMsg.slice(0, 30) + (firstMsg.length > 30 ? '...' : '');
    }
    await fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toSave),
    });
    set({ currentConversation: toSave });
    get().loadConversationList();
  },

  deleteConversation: async (id) => {
    await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
    const { currentConversation } = get();
    if (currentConversation?.id === id) {
      set({ currentConversation: createNewConversation() });
    }
    get().loadConversationList();
  },

  addUserMessage: (content) =>
    set((s) => {
      if (!s.currentConversation) return {};
      const msg: Message = { id: uuidv4(), role: 'user', content };
      return {
        currentConversation: {
          ...s.currentConversation,
          messages: [...s.currentConversation.messages, msg],
        },
      };
    }),

  finalizeAssistantMessage: (content, reasoning) =>
    set((s) => {
      if (!s.currentConversation) return {};
      const msg: Message = { id: uuidv4(), role: 'assistant', content, reasoning };
      return {
        currentConversation: {
          ...s.currentConversation,
          messages: [...s.currentConversation.messages, msg],
        },
      };
    }),
}));
