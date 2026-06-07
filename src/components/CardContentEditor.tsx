import type { Segment } from '../types'
import { SegmentPreview } from './SegmentPreview'
import { TyporaBody } from './TyporaBody'

interface CardContentEditorProps {
  cardId: string
  content: string
  isSelected: boolean
  cardRef: React.RefObject<HTMLDivElement | null>
  viewportZoom: number
  onChange: (content: string) => void
  onBlockContextMenu: (event: React.MouseEvent, block: Segment) => void
  onBlockLayout: (blockId: string, centerY: number) => void
  onRequestEdit: () => void
}

export function CardContentEditor({
  cardId,
  content,
  isSelected,
  cardRef,
  viewportZoom,
  onChange,
  onBlockContextMenu,
  onBlockLayout,
  onRequestEdit,
}: CardContentEditorProps) {
  if (!content.trim() && !isSelected) {
    return (
      <div className="md-preview md-preview--empty">
        <button
          type="button"
          className="md-preview__placeholder"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onRequestEdit}
        >
          点击开始编写
        </button>
      </div>
    )
  }

  if (!isSelected) {
    return (
      <SegmentPreview
        cardId={cardId}
        content={content}
        cardRef={cardRef}
        viewportZoom={viewportZoom}
        onBlockContextMenu={onBlockContextMenu}
        onBlockLayout={onBlockLayout}
      />
    )
  }

  return (
    <TyporaBody
      cardId={cardId}
      content={content}
      cardRef={cardRef}
      viewportZoom={viewportZoom}
      onChange={onChange}
      onBlockContextMenu={onBlockContextMenu}
      onBlockLayout={onBlockLayout}
    />
  )
}
