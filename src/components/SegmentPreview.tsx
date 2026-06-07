import { memo, useEffect, useMemo, useRef } from 'react'
import type { Segment } from '../types'
import { parseSegments } from '../lib/segments'
import { MarkdownRender } from './MarkdownRender'

interface SegmentPreviewProps {
  cardId: string
  content: string
  cardRef: React.RefObject<HTMLDivElement | null>
  viewportZoom: number
  onBlockContextMenu: (event: React.MouseEvent, block: Segment) => void
  onBlockLayout: (blockId: string, centerY: number) => void
}

/** 端口应对齐段落的实际文字，而非外层 md-block 容器 */
function measureAnchorTarget(blockEl: HTMLElement): HTMLElement {
  return (
    blockEl.querySelector('li') ??
    blockEl.querySelector('h1, h2, h3, h4, h5, h6') ??
    blockEl.querySelector('p') ??
    blockEl.querySelector('blockquote') ??
    blockEl.querySelector('pre') ??
    blockEl
  )
}

/** getBoundingClientRect 受画布 scale 影响，需换算为卡片本地坐标 */
function centerYInCard(target: HTMLElement, card: HTMLElement, zoom: number): number {
  const cardRect = card.getBoundingClientRect()
  const targetRect = target.getBoundingClientRect()
  const safeZoom = zoom > 0 ? zoom : 1
  return (targetRect.top - cardRect.top + targetRect.height / 2) / safeZoom
}

const PreviewBlock = memo(function PreviewBlock({ source }: { source: string }) {
  return <MarkdownRender content={source} className="md-preview" />
})

export function SegmentPreview({
  cardId,
  content,
  cardRef,
  viewportZoom,
  onBlockContextMenu,
  onBlockLayout,
}: SegmentPreviewProps) {
  const blocks = useMemo(() => parseSegments(cardId, content), [cardId, content])
  const blockRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const bodyRef = useRef<HTMLDivElement>(null)
  const onBlockLayoutRef = useRef(onBlockLayout)
  onBlockLayoutRef.current = onBlockLayout

  useEffect(() => {
    const body = bodyRef.current
    if (!body) return

    let raf = 0
    const measure = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const cardElement = cardRef.current
        if (!cardElement) return
        blocks.forEach((block) => {
          const element = blockRefs.current.get(block.id)
          if (!element) return
          const target = measureAnchorTarget(element)
          const centerY = centerYInCard(target, cardElement, viewportZoom)
          onBlockLayoutRef.current(block.id, centerY)
        })
      })
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(body)

    const scrollEl = body.closest('.card__body')
    scrollEl?.addEventListener('scroll', measure, { passive: true })

    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
      scrollEl?.removeEventListener('scroll', measure)
    }
  }, [blocks, cardRef, viewportZoom])

  if (blocks.length === 0) {
    return <div className="md-preview md-preview--empty" />
  }

  return (
    <div ref={bodyRef} className="md-preview md-preview--blocks">
      {blocks.map((block) => (
        <div
          key={block.id}
          ref={(element) => {
            if (element) blockRefs.current.set(block.id, element)
            else blockRefs.current.delete(block.id)
          }}
          className={`md-block md-block--${block.kind}`}
          data-anchor-id={block.id}
          onContextMenu={(event) => {
            event.preventDefault()
            event.stopPropagation()
            onBlockContextMenu(event, block)
          }}
        >
          <PreviewBlock source={block.source} />
        </div>
      ))}
      <div className="md-block__hint">选中卡片后单击段落编辑 · 右键设置端口</div>
    </div>
  )
}
