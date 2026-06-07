import type { Components } from 'react-markdown'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import rehypeHighlight from 'rehype-highlight'
import rehypeRaw from 'rehype-raw'

interface MarkdownRenderProps {
  content: string
  className?: string
  /** Typora 叠层模式：去掉块级 margin，便于与透明 textarea 对齐 */
  flat?: boolean
}

const flatComponents: Components = {
  p: ({ children }) => <div className="typora-flat-p">{children}</div>,
  h1: ({ children }) => <div className="typora-flat-h1">{children}</div>,
  h2: ({ children }) => <div className="typora-flat-h2">{children}</div>,
  h3: ({ children }) => <div className="typora-flat-h3">{children}</div>,
  h4: ({ children }) => <div className="typora-flat-h4">{children}</div>,
  ul: ({ children }) => <div className="typora-flat-ul">{children}</div>,
  ol: ({ children }) => <div className="typora-flat-ol">{children}</div>,
  li: ({ children }) => <div className="typora-flat-li">{children}</div>,
  blockquote: ({ children }) => <div className="typora-flat-quote">{children}</div>,
}

export function MarkdownRender({ content, className, flat = false }: MarkdownRenderProps) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex, rehypeHighlight, rehypeRaw]}
        components={flat ? flatComponents : undefined}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
