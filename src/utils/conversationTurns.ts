import type { Message } from '~/store';

export interface PromptTurn {
  key: string;
  index: number;
  userMessageIndex: number;
  assistantMessageIndex?: number;
  user: Message;
  assistant?: Message;
}

export function getPromptTurns(messages: Message[]): PromptTurn[] {
  const turns: PromptTurn[] = [];

  for (let index = 0; index < messages.length; index += 1) {
    const message = messages[index];
    if (message.role !== 'user') continue;

    const nextMessage = messages[index + 1];
    const assistant = nextMessage?.role === 'assistant' ? nextMessage : undefined;

    turns.push({
      key: message.id,
      index: turns.length,
      userMessageIndex: index,
      assistantMessageIndex: assistant ? index + 1 : undefined,
      user: message,
      assistant,
    });
  }

  return turns;
}
