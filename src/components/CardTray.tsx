import { memo, useCallback, useEffect, useRef, useState } from 'react'
import type { CardGroup } from '../types'
import { computeTrayBounds, TRAY_TITLE_HEIGHT } from '../lib/groups'

const DRAG_THRESHOLD = 4
import { useEditorStore } from '../store/useEditorStore'
import { TrayContextMenu } from './TrayContextMenu'
import './CardTray.css'

interface CardTrayProps {
  group: CardGroup
  viewportZoom: number
}

export const CardTray = memo(function CardTray({ group, viewportZoom }: CardTrayProps) {
  const cards = useEditorStore((s) => s.cards)
  const updateGroup = useEditorStore((s) => s.updateGroup)
  const moveGroupCards = useEditorStore((s) => s.moveGroupCards)
  const beginDragSnapshot = useEditorStore((s) => s.beginDragSnapshot)
  const clearDragSnapshot = useEditorStore((s) => s.clearDragSnapshot)
  const bounds = computeTrayBounds(cards, group.cardIds)
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState(group.title)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const dragRef = useRef<{
    startX: number
    startY: number
    lastX: number
    lastY: number
    didMove: boolean
    historyStarted: boolean
  } | null>(null)

  useEffect(() => {
    if (!isEditingTitle) setTitleDraft(group.title)
  }, [group.title, isEditingTitle])

  useEffect(() => {
    if (!isEditingTitle) return
    titleInputRef.current?.focus()
    titleInputRef.current?.select()
  }, [isEditingTitle])

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      const drag = dragRef.current
      if (!drag) return
      const pxDx = e.clientX - drag.startX
      const pxDy = e.clientY - drag.startY
      if (
        !drag.didMove &&
        (Math.abs(pxDx) >= DRAG_THRESHOLD || Math.abs(pxDy) >= DRAG_THRESHOLD)
      ) {
        drag.didMove = true
        if (!drag.historyStarted) {
          beginDragSnapshot()
          drag.historyStarted = true
        }
      }

      const dx = (e.clientX - drag.lastX) / viewportZoom
      const dy = (e.clientY - drag.lastY) / viewportZoom
      if (dx !== 0 || dy !== 0) {
        moveGroupCards(group.id, { x: dx, y: dy })
        drag.lastX = e.clientX
        drag.lastY = e.clientY
      }
    },
    [beginDragSnapshot, group.id, moveGroupCards, viewportZoom],
  )

  const onPointerUp = useCallback(() => {
    dragRef.current = null
    clearDragSnapshot()
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
  }, [clearDragSnapshot, onPointerMove])

  useEffect(
    () => () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    },
    [onPointerMove, onPointerUp],
  )

  if (!bounds) return null

  const commitTitle = () => {
    const next = titleDraft.trim() || '组合'
    if (next !== group.title) updateGroup(group.id, { title: next })
    setIsEditingTitle(false)
  }

  const startDrag = (e: React.PointerEvent) => {
    if (isEditingTitle) return
    e.stopPropagation()
    e.preventDefault()
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      didMove: false,
      historyStarted: false,
    }
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
  }

  return (
    <>
      <div
        className="card-tray"
        style={{
          left: bounds.x,
          top: bounds.y,
          width: bounds.width,
          height: bounds.height,
        }}
      >
        <div
          className="card-tray__titlebar"
          style={{ height: TRAY_TITLE_HEIGHT }}
          onPointerDown={startDrag}
          onDoubleClick={(e) => {
            e.stopPropagation()
            setTitleDraft(group.title)
            setIsEditingTitle(true)
          }}
          onContextMenu={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setMenu({ x: e.clientX, y: e.clientY })
          }}
        >
          {isEditingTitle ? (
            <input
              ref={titleInputRef}
              className="card-tray__title-input"
              value={titleDraft}
              onPointerDown={(e) => e.stopPropagation()}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  commitTitle()
                }
                if (e.key === 'Escape') {
                  e.preventDefault()
                  setTitleDraft(group.title)
                  setIsEditingTitle(false)
                }
              }}
            />
          ) : (
            <span className="card-tray__title-label" title="双击编辑 · 拖拽移动整组">
              {group.title || '组合'}
            </span>
          )}
        </div>
        <div className="card-tray__body" />
      </div>

      {menu && (
        <TrayContextMenu
          x={menu.x}
          y={menu.y}
          groupTitle={group.title}
          onClose={() => setMenu(null)}
          onDissolve={() => useEditorStore.getState().removeGroup(group.id)}
        />
      )}
    </>
  )
})
