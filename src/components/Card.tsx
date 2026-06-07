import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Card as CardType } from '../types'
import { useEditorStore } from '../store/useEditorStore'
import { getCardAnchorId, parseSegments } from '../lib/segments'
import { findAnchorMeta, getVisibleAnchors } from '../lib/anchors'
import { CardContentEditor } from './CardContentEditor'
import { AnchorPort } from './AnchorPort'
import { AnchorContextMenu } from './AnchorContextMenu'
import { CardContextMenu } from './CardContextMenu'
import { TitleHuePicker } from './TitleHuePicker'
import { titleColorFromHue } from '../lib/theme'
import { CARD_TITLEBAR_HEIGHT } from '../types/constants'
import './Card.css'

interface CardProps {
  card: CardType
}

type ResizeDir = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

const MIN_W = 280
const MIN_H = 200
const DRAG_THRESHOLD = 4

export const Card = memo(function Card({ card }: CardProps) {
  const updateCard = useEditorStore((s) => s.updateCard)
  const updateCardContent = useEditorStore((s) => s.updateCardContent)
  const removeCard = useEditorStore((s) => s.removeCard)
  const addCardFromPreset = useEditorStore((s) => s.addCardFromPreset)
  const applyPresetToCard = useEditorStore((s) => s.applyPresetToCard)
  const duplicateCard = useEditorStore((s) => s.duplicateCard)
  const cards = useEditorStore((s) => s.cards)
  const selectCard = useEditorStore((s) => s.selectCard)
  const toggleCardSelection = useEditorStore((s) => s.toggleCardSelection)
  const rangeSelectCard = useEditorStore((s) => s.rangeSelectCard)
  const selectedCardIds = useEditorStore((s) => s.selectedCardIds)
  const beginDragSnapshot = useEditorStore((s) => s.beginDragSnapshot)
  const endDragSnapshot = useEditorStore((s) => s.endDragSnapshot)
  const clearDragSnapshot = useEditorStore((s) => s.clearDragSnapshot)
  const createGroupFromCards = useEditorStore((s) => s.createGroupFromCards)
  const theme = useEditorStore((s) => s.theme)
  const viewportZoom = useEditorStore((s) => s.viewport.zoom)
  const setAnchorOverride = useEditorStore((s) => s.setAnchorOverride)
  const resetAnchorOverride = useEditorStore((s) => s.resetAnchorOverride)
  const isSelected = selectedCardIds.includes(card.id)
  const isMultiSelected = isSelected && selectedCardIds.length > 1
  const [blockCenters, setBlockCenters] = useState<Record<string, number>>({})
  const [menu, setMenu] = useState<{ x: number; y: number; anchorId: string } | null>(null)
  const [cardMenu, setCardMenu] = useState<{ x: number; y: number } | null>(null)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState(card.title)

  const cardRef = useRef<HTMLDivElement>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const dragRef = useRef<{
    type: 'move' | 'resize'
    dir?: ResizeDir
    startX: number
    startY: number
    origX: number
    origY: number
    origW: number
    origH: number
    movingIds?: string[]
    origPositions?: Record<string, { x: number; y: number }>
    origSizes?: Record<string, { width: number; height: number }>
    didMove?: boolean
    historyStarted?: boolean
  } | null>(null)

  const blocks = useMemo(() => parseSegments(card.id, card.content), [card.id, card.content])
  const cardAnchorId = getCardAnchorId(card.id)

  const visibleAnchors = useMemo(
    () => getVisibleAnchors(card.id, card.size.height, blockCenters, blocks, card.anchorOverrides ?? {}),
    [blockCenters, blocks, card.anchorOverrides, card.id, card.size.height],
  )

  const cardAnchor = useMemo(
    () => visibleAnchors.find((anchor) => anchor.anchorId === cardAnchorId) ?? null,
    [cardAnchorId, visibleAnchors],
  )

  /** 仅显示正文可视区域内的段落端口，避免列表过长时节点悬在卡片外 */
  const segmentAnchors = useMemo(() => {
    const minY = CARD_TITLEBAR_HEIGHT + 2
    const maxY = card.size.height - 2
    return visibleAnchors.filter(
      (anchor) =>
        anchor.anchorId !== cardAnchorId && anchor.y >= minY && anchor.y <= maxY,
    )
  }, [card.size.height, cardAnchorId, visibleAnchors])

  const handleBlockLayout = useCallback((blockId: string, centerY: number) => {
    setBlockCenters((current) => {
      if (current[blockId] === centerY) return current
      return { ...current, [blockId]: centerY }
    })
  }, [])

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      const d = dragRef.current
      if (!d) return

      const dx = (e.clientX - d.startX) / viewportZoom
      const dy = (e.clientY - d.startY) / viewportZoom
      const pxDx = e.clientX - d.startX
      const pxDy = e.clientY - d.startY

      if (
        !d.didMove &&
        (Math.abs(pxDx) >= DRAG_THRESHOLD || Math.abs(pxDy) >= DRAG_THRESHOLD)
      ) {
        d.didMove = true
        if (!d.historyStarted) {
          beginDragSnapshot()
          d.historyStarted = true
        }
      }

      if (d.type === 'move') {
        if (d.movingIds && d.movingIds.length > 1 && d.origPositions) {
          const positions = d.origPositions
          useEditorStore.setState((state) => ({
            cards: state.cards.map((item) => {
              const orig = positions[item.id]
              if (!orig) return item
              return { ...item, position: { x: orig.x + dx, y: orig.y + dy } }
            }),
          }))
        } else {
          updateCard(card.id, { position: { x: d.origX + dx, y: d.origY + dy } })
        }
        return
      }

      const dir = d.dir!
      let x = d.origX
      let y = d.origY
      let w = d.origW
      let h = d.origH

      if (dir.includes('e')) w = d.origW + dx
      if (dir.includes('w')) {
        w = d.origW - dx
        x = d.origX + dx
      }
      if (dir.includes('s')) h = d.origH + dy
      if (dir.includes('n')) {
        h = d.origH - dy
        y = d.origY + dy
      }

      w = Math.max(MIN_W, w)
      h = Math.max(MIN_H, h)
      if (dir.includes('w') && w === MIN_W) x = d.origX + d.origW - MIN_W
      if (dir.includes('n') && h === MIN_H) y = d.origY + d.origH - MIN_H

      updateCard(card.id, { position: { x, y }, size: { width: w, height: h } })
    },
    [beginDragSnapshot, card.id, updateCard, viewportZoom],
  )

  const onPointerUp = useCallback(() => {
    const drag = dragRef.current
    const wasMove = drag?.type === 'move'
    const didMove = drag?.didMove ?? false
    dragRef.current = null
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
    if (wasMove && didMove) endDragSnapshot()
    else clearDragSnapshot()
  }, [clearDragSnapshot, endDragSnapshot, onPointerMove])

  const cancelDrag = useCallback(() => {
    dragRef.current = null
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
  }, [onPointerMove, onPointerUp])

  const commitTitle = useCallback(() => {
    const next = titleDraft.trim()
    if (next !== card.title) {
      updateCard(card.id, { title: next })
    }
    setIsEditingTitle(false)
  }, [card.id, card.title, titleDraft, updateCard])

  const startTitleEdit = useCallback(() => {
    cancelDrag()
    selectCard(card.id)
    setTitleDraft(card.title)
    setIsEditingTitle(true)
  }, [cancelDrag, card.id, card.title, selectCard])

  useEffect(() => {
    if (!isEditingTitle) {
      setTitleDraft(card.title)
    }
  }, [card.title, isEditingTitle])

  useEffect(() => {
    if (!isSelected && isEditingTitle) {
      commitTitle()
    }
  }, [commitTitle, isEditingTitle, isSelected])

  useEffect(() => {
    if (!isEditingTitle) return
    const input = titleInputRef.current
    input?.focus()
    input?.select()
  }, [isEditingTitle])

  const startDrag = (e: React.PointerEvent, type: 'move' | 'resize', dir?: ResizeDir) => {
    e.stopPropagation()
    e.preventDefault()
    if (!selectedCardIds.includes(card.id)) selectCard(card.id)
    let movingIds = [card.id]
    if (
      type === 'move' &&
      selectedCardIds.includes(card.id) &&
      selectedCardIds.length > 1
    ) {
      movingIds = selectedCardIds
    }
    const origPositions = Object.fromEntries(
      cards
        .filter((item) => movingIds.includes(item.id))
        .map((item) => [item.id, { ...item.position }]),
    )
    dragRef.current = {
      type,
      dir,
      startX: e.clientX,
      startY: e.clientY,
      origX: card.position.x,
      origY: card.position.y,
      origW: card.size.width,
      origH: card.size.height,
      movingIds,
      origPositions,
      didMove: false,
      historyStarted: false,
    }
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
  }

  useEffect(
    () => () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    },
    [onPointerMove, onPointerUp],
  )

  const openMenu = (event: React.MouseEvent, anchorId: string) => {
    event.preventDefault()
    event.stopPropagation()
    setCardMenu(null)
    setMenu({ x: event.clientX, y: event.clientY, anchorId })
  }

  const openCardMenu = (event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    setMenu(null)
    setCardMenu({ x: event.clientX, y: event.clientY })
  }

  const menuBlock = menu ? findAnchorMeta(card.id, menu.anchorId, blocks) : null

  return (
    <>
      <div
        ref={cardRef}
        className={[
          'card',
          isSelected ? 'card--selected' : '',
          isMultiSelected ? 'card--multi-selected' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        style={{
          left: card.position.x,
          top: card.position.y,
          width: card.size.width,
          height: card.size.height,
        }}
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest('.anchor-port')) return
          e.stopPropagation()
          if (e.ctrlKey || e.metaKey) toggleCardSelection(card.id)
          else if (e.shiftKey) rangeSelectCard(card.id)
          else selectCard(card.id)
        }}
        onContextMenu={(e) => {
          const target = e.target as HTMLElement
          if (target.closest('.anchor-port')) return
          if (target.closest('.md-block')) return
          openCardMenu(e)
        }}
      >
        <div
          className={`card__titlebar ${isEditingTitle ? 'card__titlebar--editing' : ''}`}
          style={{ backgroundColor: titleColorFromHue(card.titleHue, theme) }}
          onPointerDown={(e) => {
            if (isEditingTitle) return
            if ((e.target as HTMLElement).closest('.anchor-port')) return
            if ((e.target as HTMLElement).closest('.card__title-actions')) return
            startDrag(e, 'move')
          }}
          onDoubleClick={(e) => {
            if ((e.target as HTMLElement).closest('.card__title-actions')) return
            e.stopPropagation()
            startTitleEdit()
          }}
          onContextMenu={openCardMenu}
        >
          {cardAnchor?.isPrev && (
            <AnchorPort
              cardId={card.id}
              anchorId={cardAnchor.anchorId}
              kind="prev"
              y={cardAnchor.y}
              cardX={card.position.x}
              cardY={card.position.y}
              cardWidth={card.size.width}
              placement="titlebar"
              titleHue={card.titleHue}
              theme={theme}
            />
          )}
          {isEditingTitle ? (
            <input
              ref={titleInputRef}
              className="card__title-input"
              value={titleDraft}
              placeholder="无标题"
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
                  setTitleDraft(card.title)
                  setIsEditingTitle(false)
                }
              }}
            />
          ) : (
            <span
              className={`card__title-label ${card.title ? '' : 'card__title-label--placeholder'}`}
              title="双击编辑标题"
            >
              {card.title || '无标题'}
            </span>
          )}
          <div className="card__title-actions">
          {isSelected && (
            <TitleHuePicker
              hue={card.titleHue}
              onChange={(titleHue) => updateCard(card.id, { titleHue })}
            />
          )}
          {isSelected && (
            <button
              type="button"
              className="card__delete-btn"
              title="删除卡片 (Delete)"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => removeCard(card.id)}
            >
              ×
            </button>
          )}
          </div>
          {cardAnchor?.isNext && (
            <AnchorPort
              cardId={card.id}
              anchorId={cardAnchor.anchorId}
              kind="next"
              y={cardAnchor.y}
              cardX={card.position.x}
              cardY={card.position.y}
              cardWidth={card.size.width}
              placement="titlebar"
              titleHue={card.titleHue}
              theme={theme}
            />
          )}
        </div>

        <div
          className="card__body"
          onWheel={(e) => {
            if (!e.ctrlKey) e.stopPropagation()
          }}
        >
          <CardContentEditor
            cardId={card.id}
            content={card.content}
            isSelected={isSelected}
            cardRef={cardRef}
            viewportZoom={viewportZoom}
            onChange={(content) => updateCardContent(card.id, content)}
            onBlockContextMenu={(event, block) => openMenu(event, block.id)}
            onBlockLayout={handleBlockLayout}
            onRequestEdit={() => selectCard(card.id)}
          />
        </div>

        {segmentAnchors.map((anchor) => (
          <div key={anchor.anchorId}>
            {anchor.isPrev && (
              <AnchorPort
                cardId={card.id}
                anchorId={anchor.anchorId}
                kind="prev"
                y={anchor.y}
                cardX={card.position.x}
                cardY={card.position.y}
                cardWidth={card.size.width}
                titleHue={card.titleHue}
                theme={theme}
              />
            )}
            {anchor.isNext && (
              <AnchorPort
                cardId={card.id}
                anchorId={anchor.anchorId}
                kind="next"
                y={anchor.y}
                cardX={card.position.x}
                cardY={card.position.y}
                cardWidth={card.size.width}
                titleHue={card.titleHue}
                theme={theme}
              />
            )}
          </div>
        ))}

        {isSelected &&
          (['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'] as ResizeDir[]).map((dir) => (
            <div
              key={dir}
              className={`card__resize card__resize--${dir}`}
              onPointerDown={(e) => startDrag(e, 'resize', dir)}
            />
          ))}
      </div>

      {menu && menuBlock && (
        <AnchorContextMenu
          x={menu.x}
          y={menu.y}
          block={menuBlock}
          overrides={card.anchorOverrides?.[menu.anchorId] ?? {}}
          onClose={() => setMenu(null)}
          onToggle={(key, value) => setAnchorOverride(card.id, menu.anchorId, { [key]: value })}
          onReset={() => resetAnchorOverride(card.id, menu.anchorId)}
        />
      )}

      {cardMenu && (
        <CardContextMenu
          x={cardMenu.x}
          y={cardMenu.y}
          card={card}
          selectedCount={selectedCardIds.length}
          onClose={() => setCardMenu(null)}
          onCreateGroup={() => createGroupFromCards(selectedCardIds)}
          onCreateFromPreset={(presetId) => {
            addCardFromPreset(presetId, {
              x: card.position.x + 40,
              y: card.position.y + 40,
            })
          }}
          onApplyPreset={(presetId) => applyPresetToCard(card.id, presetId)}
          onDuplicate={() => duplicateCard(card.id)}
          onDelete={() => removeCard(card.id)}
        />
      )}
    </>
  )
})
