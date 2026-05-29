import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  reasoning?: string;
  model?: string;
  stats?: MessageStats;
  error?: MessageError;
}

export interface MessageError {
  code?: string;
  title: string;
  message: string;
}

export interface MessageStats {
  completionTokens?: number;
  completionEstimated?: boolean;
  completionDurationMs?: number;
  completionTokensPerSecond?: number;
  completionCostCny?: number;
  reasoningTokens?: number;
  reasoningEstimated?: boolean;
  reasoningDurationMs?: number;
  reasoningTokensPerSecond?: number;
  reasoningCostCny?: number;
  promptTokens?: number;
  promptCacheHitTokens?: number;
  promptCacheMissTokens?: number;
  promptCostCny?: number;
  requestParams?: Record<string, unknown>;
}

export interface Conversation {
  id: string;
  title: string;
  model: string;
  systemPrompt: string;
  thinkingLevel: ThinkingLevel;
  params: ModelParams;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

export type ThinkingLevel = 'off' | 'high' | 'max';

export interface ModelParams {
  temperature: number;
  top_p: number;
  max_tokens: number;
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
};

const DEFAULT_MODEL = 'deepseek-v4-flash';
const DEFAULT_THINKING_LEVEL: ThinkingLevel = 'high';
const MODEL_SETTINGS_STORAGE_KEY = 'promptcraft:model-settings';
const LAST_MODEL_STORAGE_KEY = 'promptcraft:last-model';

interface StoredModelSettings {
  params?: Partial<ModelParams>;
  thinkingLevel?: ThinkingLevel;
}

function hasLocalStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function isThinkingLevel(value: unknown): value is ThinkingLevel {
  return value === 'off' || value === 'high' || value === 'max';
}

function normalizeParams(params?: Partial<ModelParams>): ModelParams {
  return { ...DEFAULT_PARAMS, ...(params ?? {}) };
}

function readSettingsMap(): Record<string, StoredModelSettings> {
  if (!hasLocalStorage()) return {};

  try {
    const raw = window.localStorage.getItem(MODEL_SETTINGS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeSettingsMap(settings: Record<string, StoredModelSettings>) {
  if (!hasLocalStorage()) return;
  window.localStorage.setItem(MODEL_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

function readLastModel() {
  if (!hasLocalStorage()) return DEFAULT_MODEL;
  return window.localStorage.getItem(LAST_MODEL_STORAGE_KEY) || DEFAULT_MODEL;
}

function writeLastModel(model: string) {
  if (!hasLocalStorage()) return;
  window.localStorage.setItem(LAST_MODEL_STORAGE_KEY, model);
}

function readModelSettings(model: string) {
  const stored = readSettingsMap()[model];
  return {
    params: normalizeParams(stored?.params),
    thinkingLevel: isThinkingLevel(stored?.thinkingLevel)
      ? stored.thinkingLevel
      : DEFAULT_THINKING_LEVEL,
  };
}

function writeModelSettings(model: string, settings: { params: ModelParams; thinkingLevel: ThinkingLevel }) {
  const settingsMap = readSettingsMap();
  settingsMap[model] = {
    params: settings.params,
    thinkingLevel: settings.thinkingLevel,
  };
  writeSettingsMap(settingsMap);
}

function thinkingLevelFromLegacy(conversation: Partial<Conversation> & { thinkingEnabled?: boolean }) {
  if (isThinkingLevel(conversation.thinkingLevel)) return conversation.thinkingLevel;
  return conversation.thinkingEnabled === false ? 'off' : DEFAULT_THINKING_LEVEL;
}

function normalizeConversation(raw: Conversation & { thinkingEnabled?: boolean }): Conversation {
  return {
    ...raw,
    model: raw.model || DEFAULT_MODEL,
    title: raw.title || '新对话',
    systemPrompt: raw.systemPrompt || '',
    thinkingLevel: thinkingLevelFromLegacy(raw),
    params: normalizeParams(raw.params),
    messages: raw.messages || [],
  };
}

function createNewConversation(): Conversation {
  const model = readLastModel();
  const settings = readModelSettings(model);

  return {
    id: uuidv4(),
    title: '新对话',
    model,
    systemPrompt: '',
    thinkingLevel: settings.thinkingLevel,
    params: settings.params,
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
  streamingError?: MessageError;
  streamingStats: MessageStats;
  sidebarOpen: boolean;

  setSidebarOpen: (open: boolean) => void;
  setTitle: (title: string) => void;
  setModel: (model: string) => void;
  setSystemPrompt: (prompt: string) => void;
  setThinkingLevel: (level: ThinkingLevel) => void;
  setParams: (params: Partial<ModelParams>) => void;
  setStreaming: (streaming: boolean) => void;
  appendStreamContent: (content: string) => void;
  appendStreamReasoning: (reasoning: string) => void;
  setStreamingError: (error: MessageError) => void;
  setStreamingStats: (stats: MessageStats) => void;
  resetStream: () => void;

  newConversation: () => void;
  loadConversationList: () => Promise<void>;
  loadConversation: (id: string) => Promise<void>;
  saveConversation: (conversation?: Conversation) => Promise<void>;
  renameConversation: (id: string, title: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;

  addUserMessage: (content: string) => void;
  prepareAssistantRetry: (assistantId: string) => Conversation | null;
  updateUserMessageAndTruncate: (messageId: string, newContent: string) => Conversation | null;
  finalizeAssistantMessage: (
    content: string,
    reasoning?: string,
    stats?: MessageStats,
    error?: MessageError,
  ) => void;
}

export const useStore = create<AppState>((set, get) => ({
  conversations: [],
  currentConversation: createNewConversation(),
  isStreaming: false,
  streamingContent: '',
  streamingReasoning: '',
  streamingError: undefined,
  streamingStats: {},
  sidebarOpen: true,

  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  setTitle: (title) =>
    set((s) => ({
      currentConversation: s.currentConversation
        ? { ...s.currentConversation, title: title || '新对话' }
        : null,
    })),

  setModel: (model) =>
    set((s) => {
      if (!s.currentConversation) return {};
      const settings = readModelSettings(model);
      writeLastModel(model);
      return {
        currentConversation: {
          ...s.currentConversation,
          model,
          params: settings.params,
          thinkingLevel: settings.thinkingLevel,
        },
      };
    }),

  setSystemPrompt: (prompt) =>
    set((s) => ({
      currentConversation: s.currentConversation
        ? { ...s.currentConversation, systemPrompt: prompt }
        : null,
    })),

  setThinkingLevel: (level) =>
    set((s) => {
      if (!s.currentConversation) return {};
      writeModelSettings(s.currentConversation.model, {
        params: s.currentConversation.params,
        thinkingLevel: level,
      });
      return {
        currentConversation: {
          ...s.currentConversation,
          thinkingLevel: level,
        },
      };
    }),

  setParams: (params) =>
    set((s) => {
      if (!s.currentConversation) return {};
      const nextParams = { ...s.currentConversation.params, ...params };
      writeModelSettings(s.currentConversation.model, {
        params: nextParams,
        thinkingLevel: s.currentConversation.thinkingLevel,
      });
      return {
        currentConversation: {
          ...s.currentConversation,
          params: nextParams,
        },
      };
    }),

  setStreaming: (streaming) => set({ isStreaming: streaming }),
  appendStreamContent: (content) =>
    set((s) => ({ streamingContent: s.streamingContent + content })),
  appendStreamReasoning: (reasoning) =>
    set((s) => ({ streamingReasoning: s.streamingReasoning + reasoning })),
  setStreamingError: (error) => set({ streamingError: error }),
  setStreamingStats: (stats) => set({ streamingStats: stats }),
  resetStream: () =>
    set({ streamingContent: '', streamingReasoning: '', streamingError: undefined, streamingStats: {} }),

  newConversation: () =>
    set({
      currentConversation: createNewConversation(),
      isStreaming: false,
      streamingContent: '',
      streamingReasoning: '',
      streamingError: undefined,
      streamingStats: {},
    }),

  loadConversationList: async () => {
    const res = await fetch('/api/conversations');
    const data = await res.json();
    set({ conversations: data });
  },

  loadConversation: async (id) => {
    const res = await fetch(`/api/conversations/${id}`);
    if (res.ok) {
      const data = await res.json();
      set({
        currentConversation: normalizeConversation(data),
        isStreaming: false,
        streamingContent: '',
        streamingReasoning: '',
        streamingError: undefined,
        streamingStats: {},
      });
    }
  },

  saveConversation: async (conversation) => {
    const conv = conversation ?? get().currentConversation;
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
    if (get().currentConversation?.id === toSave.id) {
      set({ currentConversation: toSave });
    }
    get().loadConversationList();
  },

  renameConversation: async (id, title) => {
    await fetch(`/api/conversations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    const { currentConversation } = get();
    if (currentConversation?.id === id) {
      set({ currentConversation: { ...currentConversation, title } });
    }
    get().loadConversationList();
  },

  deleteConversation: async (id) => {
    await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
    const { currentConversation } = get();
    if (currentConversation?.id === id) {
      set({
        currentConversation: createNewConversation(),
        isStreaming: false,
        streamingContent: '',
        streamingReasoning: '',
        streamingError: undefined,
        streamingStats: {},
      });
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

  updateUserMessageAndTruncate: (messageId, newContent) => {
    const conv = get().currentConversation;
    if (!conv) return null;

    const idx = conv.messages.findIndex((m) => m.id === messageId && m.role === 'user');
    if (idx === -1) return null;

    const updated = conv.messages.slice(0, idx + 1).map((m) =>
      m.id === messageId ? { ...m, content: newContent } : m,
    );
    const nextConversation = { ...conv, messages: updated, updatedAt: new Date().toISOString() };
    set({ currentConversation: nextConversation });
    return nextConversation;
  },

  prepareAssistantRetry: (assistantId) => {
    const conv = get().currentConversation;
    if (!conv) return null;

    const assistantIndex = conv.messages.findIndex(
      (message) => message.id === assistantId && message.role === 'assistant',
    );
    if (assistantIndex === -1) return null;

    let userIndex = -1;
    for (let index = assistantIndex - 1; index >= 0; index -= 1) {
      if (conv.messages[index].role === 'user') {
        userIndex = index;
        break;
      }
    }
    if (userIndex === -1) return null;

    const nextConversation = {
      ...conv,
      messages: conv.messages.slice(0, assistantIndex),
      updatedAt: new Date().toISOString(),
    };
    set({ currentConversation: nextConversation });
    return nextConversation;
  },

  finalizeAssistantMessage: (content, reasoning, stats, error) =>
    set((s) => {
      if (!s.currentConversation) return {};
      const msg: Message = {
        id: uuidv4(),
        role: 'assistant',
        content,
        reasoning,
        model: s.currentConversation.model,
        stats,
        error,
      };
      return {
        currentConversation: {
          ...s.currentConversation,
          messages: [...s.currentConversation.messages, msg],
        },
      };
    }),
}));
