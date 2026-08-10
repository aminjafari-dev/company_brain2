import React from 'react';
import ReactMarkdown from 'react-markdown';

interface MarkdownContentProps {
  content: string;
  className?: string;
}

/**
 * Renders AI/chat markdown (bold, lists, code, headings, links) with app styles.
 */
export const MarkdownContent: React.FC<MarkdownContentProps> = ({
  content,
  className = '',
}) => {
  return (
    <div className={`chat-markdown text-[15px] text-[#191c1e] leading-relaxed ${className}`}>
      <ReactMarkdown
        components={{
          p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
          strong: ({ children }) => (
            <strong className="font-semibold text-[#191c1e]">{children}</strong>
          ),
          em: ({ children }) => <em className="italic text-[#191c1e]">{children}</em>,
          h1: ({ children }) => (
            <h1 className="text-[20px] font-semibold text-[#191c1e] mt-1 mb-2">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-[18px] font-semibold text-[#191c1e] mt-1 mb-2">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-[16px] font-semibold text-[#191c1e] mt-1 mb-2">{children}</h3>
          ),
          ul: ({ children }) => (
            <ul className="mb-3 last:mb-0 list-disc pl-5 space-y-1.5">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-3 last:mb-0 list-decimal pl-5 space-y-1.5">{children}</ol>
          ),
          li: ({ children }) => <li className="text-[15px] text-[#191c1e]">{children}</li>,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="text-[#4648d4] hover:underline font-medium"
            >
              {children}
            </a>
          ),
          code: ({ className: codeClass, children }) => {
            const isBlock = Boolean(codeClass);
            if (isBlock) {
              return (
                <code className="block font-mono text-[13px] text-[#191c1e] whitespace-pre">
                  {children}
                </code>
              );
            }
            return (
              <code className="px-1.5 py-0.5 rounded bg-[#f2f4f6] border border-[#c6c6cd]/60 font-mono text-[13px] text-[#191c1e]">
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="mb-3 last:mb-0 overflow-x-auto rounded-lg bg-[#f7f9fb] border border-[#c6c6cd]/60 p-3">
              {children}
            </pre>
          ),
          blockquote: ({ children }) => (
            <blockquote className="mb-3 last:mb-0 border-l-2 border-[#6063ee] pl-3 text-[#45464d]">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-4 border-[#c6c6cd]/60" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
