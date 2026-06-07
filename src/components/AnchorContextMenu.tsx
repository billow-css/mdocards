import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useMenuPosition } from '../hooks/useMenuPosition'
import type { Segment } from '../types'
import { resolveAnchorSettings, SEGMENT_PORT_RULES } from '../lib/segments'

interface AnchorContextMenuProps {
  x: number
  y: number
  block: Pick<Segment, 'id' | 'kind' | 'defaultPrev' | 'defaultNext' | 'preview'>
  overrides: Partial<{ isPrev: boolean; isNext: boolean }>
  onClose: () => void
  onToggle: (key: 'isPrev' | 'isNext', value: boolean) => void
  onReset: () => void
}

export function AnchorContextMenu({
  x,
  y,
  block,
  overrides,
  onClose,
  onToggle,
  onReset,
}: AnchorContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null)
  const settings = resolveAnchorSettings(block, { [block.id]: overrides })
  const rule = SEGMENT_PORT_RULES[block.kind] ?? SEGMENT_PORT_RULES.paragraph

  useMenuPosition(ref, x, y)

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) onClose()
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('pointerdown', handlePointerDown, true)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown, true)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  return createPortal(
    <div
      ref={ref}
      className="anchor-menu"
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="anchor-menu__title">{block.preview}</div>
      <div className="anchor-menu__meta">
        {rule.label} · 默认 prev {rule.defaultPrev ? '开' : '关'} · next {rule.defaultNext ? '开' : '关'}
      </div>
      <label className="anchor-menu__item">
        <input
          type="checkbox"
          checked={settings.isPrev}
          onChange={(event) => onToggle('isPrev', event.target.checked)}
        />
        启用前驱端口 (prev)
      </label>
      <label className="anchor-menu__item">
        <input
          type="checkbox"
          checked={settings.isNext}
          onChange={(event) => onToggle('isNext', event.target.checked)}
        />
        启用后继端口 (next)
      </label>
      <button type="button" className="anchor-menu__reset" onClick={onReset}>
        恢复默认
      </button>
    </div>,
    document.body,
  )
}
