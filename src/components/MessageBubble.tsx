import type { Message } from '~/store';
import Markdown from './Markdown';
import Thinking from './Thinking';

interface Props {
  message: Message;
  isStreaming?: boolean;
}

export default function MessageBubble({ message, isStreaming }: Props) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="mb-6 flex justify-end">
        <div className="max-w-[80%] rounded-3xl bg-gray-100 px-5 py-3 text-sm leading-relaxed text-gray-900 whitespace-pre-wrap">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6">
      {message.reasoning && (
        <Thinking content={message.reasoning} isStreaming={isStreaming && !message.content} />
      )}

      {message.content ? (
        <div
          className={`prose max-w-none text-sm leading-relaxed text-gray-800 ${
            isStreaming ? 'result-streaming' : ''
          }`}
        >
          <Markdown content={message.content} />
        </div>
      ) : (
        isStreaming &&
        !message.reasoning && <span className="result-thinking text-gray-400 text-sm" />
      )}
    </div>
  );
}
