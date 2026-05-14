import { useState, memo, useCallback } from 'react';
import { Lightbulb, ChevronDown, Copy, Check } from 'lucide-react';

interface Props {
  content: string;
  isStreaming?: boolean;
}

const Thinking = memo(function Thinking({ content, isStreaming }: Props) {
  const [expanded, setExpanded] = useState(true);
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [content]);

  if (!content) return null;

  return (
    <div className="group/thinking mb-4">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 rounded-lg py-1 text-sm text-gray-400 transition-colors hover:text-gray-600"
        >
          <span className="relative flex h-[18px] w-[18px] items-center justify-center">
            <Lightbulb
              size={16}
              className="absolute text-gray-400 transition-opacity group-hover/thinking:opacity-0"
            />
            <ChevronDown
              size={16}
              className={`absolute text-gray-500 opacity-0 transition-all group-hover/thinking:opacity-100 ${
                expanded ? 'rotate-180' : ''
              }`}
            />
          </span>
          思考过程
          {isStreaming && <span className="result-thinking" />}
        </button>

        {expanded && content && (
          <button
            onClick={handleCopy}
            className="rounded-md p-1.5 text-gray-400 opacity-0 transition-opacity hover:bg-gray-100 hover:text-gray-600 group-hover/thinking:opacity-100"
            title="复制思考内容"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
        )}
      </div>

      {expanded && (
        <div className="mt-2 rounded-xl border border-gray-100 bg-gray-50 p-3">
          <p
            className={`whitespace-pre-wrap text-sm leading-relaxed text-gray-500 ${
              isStreaming ? 'result-streaming' : ''
            }`}
          >
            {content}
          </p>
        </div>
      )}
    </div>
  );
});

export default Thinking;
