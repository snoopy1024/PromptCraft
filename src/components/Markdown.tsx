import { memo, useCallback, useState, isValidElement, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import { Check, Copy } from 'lucide-react';
import 'highlight.js/styles/github.css';

const remarkPlugins = [remarkGfm, remarkMath];
const rehypePlugins = [rehypeHighlight, rehypeKatex];

function extractText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map(extractText).join('');
  }

  if (isValidElement<{ children?: ReactNode }>(node)) {
    return extractText(node.props.children);
  }

  return '';
}

function CodeBlock({ children, className, ...props }: ComponentPropsWithoutRef<'pre'>) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    const code = extractText(children).replace(/\n$/, '');
    if (!code) return;

    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }, [children]);

  return (
    <pre {...props} className={`code-block ${className ?? ''}`}>
      <button
        type="button"
        onClick={handleCopy}
        className="code-copy-button"
        aria-label={copied ? '已复制代码' : '复制代码'}
        data-tooltip={copied ? 'Copied' : 'Copy'}
        title={copied ? '已复制' : '复制代码'}
      >
        {copied ? <Check size={16} /> : <Copy size={16} />}
      </button>
      {children}
    </pre>
  );
}

function formatStandaloneJson(content: string) {
  const trimmed = content.trim();
  if (!trimmed || !/^[\[{]/.test(trimmed) || trimmed.includes('```')) return null;

  try {
    const parsed = JSON.parse(trimmed);
    if (parsed === null || typeof parsed !== 'object') return null;
    return JSON.stringify(parsed, null, 2);
  } catch {
    return null;
  }
}

interface Props {
  content: string;
}

const Markdown = memo(function Markdown({ content }: Props) {
  const formattedJson = formatStandaloneJson(content);
  const markdownContent = formattedJson
    ? `\`\`\`json\n${formattedJson}\n\`\`\``
    : content;

  return (
    <ReactMarkdown
      remarkPlugins={remarkPlugins}
      rehypePlugins={rehypePlugins}
      components={{ pre: CodeBlock }}
    >
      {markdownContent}
    </ReactMarkdown>
  );
});

export default Markdown;
