import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Segment } from '../types'
import {
  insertSegmentAfter,
  isEffectivelyEmptySource,
  parseSegments,
  placeholderEmptySource,
  removeSegmentIfEmpty,
  serializeSegments,
  splitSegmentAt,
  toEditorSource,
  updateSegmentSource,
} from '../lib/segments'
import { TyporaBlock } from './TyporaBlock'

interface TyporaBodyProps {
  cardId: string
  content: string
  cardRef: React.RefObject<HTMLDivElement | null>
  viewportZoom: number
  onChange: (content: string) => void
  onBlockContextMenu: (event: React.MouseEvent, block: Segment) => void
  onBlockLayout: (blockId: string, centerY: number) => void
}

function measureAnchorTarget(blockEl: HTMLElement): HTMLElement {
  return (
    blockEl.querySelector('li') ??
    blockEl.querySelector('h1, h2, h3, h4, h5, h6') ??
    blockEl.querySelector('.typora-flat-h1, .typora-flat-h2, .typora-flat-h3, .typora-flat-h4') ??
    blockEl.querySelector('p, .typora-flat-p') ??
    blockEl.querySelector('blockquote, .typora-flat-quote') ??
    blockEl.querySelector('pre') ??
    blockEl.querySelector('textarea') ??
    blockEl
  )
}

function centerYInCard(target: HTMLElement, card: HTMLElement, zoom: number): number {
  const cardRect = card.getBoundingClientRect()
  const targetRect = target.getBoundingClientRect()
  const safeZoom = zoom > 0 ? zoom : 1
  return (targetRect.top - cardRect.top + targetRect.height / 2) / safeZoom
}

function applyDrafts(
  cardId: string,
  segments: Segment[],
  drafts: Record<number, string>,
): Segment[] {
  let next = segments
  const indices = Object.keys(drafts)
    .map(Number)
    .sort((a, b) => a - b)

  for (const index of indices) {
    const draft = drafts[index]
    const block = next[index]
    if (!block || draft === undefined || draft === block.source) continue
    next = parseSegments(cardId, updateSegmentSource(next, block.id, draft))
  }
  return next
}

function isPlaceholderParagraph(source: string): boolean {
  return isEffectivelyEmptySource(source)
}

function findInsertedBlockIndex(prev: Segment[], next: Segment[], afterIndex: number): number {
  if (next.length > prev.length) {
    return afterIndex + 1
  }
  for (let i = afterIndex + 1; i < next.length; i++) {
    if (next[i].kind === 'paragraph' && isPlaceholderParagraph(next[i].source)) {
      return i
    }
  }
  for (let i = afterIndex + 1; i < next.length; i++) {
    if (i >= prev.length || prev[i]?.source !== next[i]?.source) {
      return i
    }
  }
  return Math.min(afterIndex + 1, Math.max(0, next.length - 1))
}

function shiftDraftsAfterInsert(
  drafts: Record<number, string>,
  afterIndex: number,
): Record<number, string> {
  const next: Record<number, string> = {}
  for (const [key, value] of Object.entries(drafts)) {
    const index = Number(key)
    if (index <= afterIndex) next[index] = value
    else next[index + 1] = value
  }
  return next
}

function shiftDraftsAfterRemove(
  drafts: Record<number, string>,
  removedIndex: number,
): Record<number, string> {
  const next: Record<number, string> = {}
  for (const [key, value] of Object.entries(drafts)) {
    const index = Number(key)
    if (index < removedIndex) next[index] = value
    else if (index > removedIndex) next[index - 1] = value
  }
  return next
}

const EMPTY_BLOCK: Segment = {
  id: 'draft:paragraph:0',
  kind: 'paragraph',
  source: '',
  preview: '',
  defaultPrev: false,
  defaultNext: false,
}

export function TyporaBody({
  cardId,
  content,
  cardRef,
  viewportZoom,
  onChange,
  onBlockContextMenu,
  onBlockLayout,
}: TyporaBodyProps) {
  const blocks = useMemo(() => parseSegments(cardId, content), [cardId, content])
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [draftByIndex, setDraftByIndex] = useState<Record<number, string>>({})
  const [emptyDraft, setEmptyDraft] = useState('')
  const focusIndexRef = useRef<number | null>(null)
  const skipDeactivateRef = useRef(false)
  const deactivateTimerRef = useRef<number | null>(null)
  const blockRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const bodyRef = useRef<HTMLDivElement>(null)
  const blocksRef = useRef(blocks)
  const draftRef = useRef(draftByIndex)
  const emptyDraftRef = useRef(emptyDraft)
  const onChangeRef = useRef(onChange)
  const onBlockLayoutRef = useRef(onBlockLayout)

  blocksRef.current = blocks
  draftRef.current = draftByIndex
  emptyDraftRef.current = emptyDraft
  onChangeRef.current = onChange
  onBlockLayoutRef.current = onBlockLayout

  const getWorkingSegments = useCallback(() => {
    return applyDrafts(cardId, blocksRef.current, draftRef.current)
  }, [cardId])

  const persistIfDrafts = useCallback(() => {
    const nextContent = serializeSegments(getWorkingSegments())
    const stored = serializeSegments(blocksRef.current)

    if (emptyDraftRef.current.trim() && blocksRef.current.length === 0) {
      onChangeRef.current(emptyDraftRef.current)
      return
    }

    if (nextContent !== stored) {
      onChangeRef.current(nextContent)
    }
  }, [getWorkingSegments])

  const cancelDeactivate = useCallback(() => {
    if (deactivateTimerRef.current !== null) {
      window.clearTimeout(deactivateTimerRef.current)
      deactivateTimerRef.current = null
    }
  }, [])

  const scheduleDeactivate = useCallback(() => {
    cancelDeactivate()
    deactivateTimerRef.current = window.setTimeout(() => {
      deactivateTimerRef.current = null
      if (skipDeactivateRef.current) {
        skipDeactivateRef.current = false
        return
      }
      const active = document.activeElement
      if (bodyRef.current?.contains(active) && active?.tagName === 'TEXTAREA') {
        return
      }
      persistIfDrafts()
      setActiveIndex(null)
    }, 40)
  }, [cancelDeactivate, persistIfDrafts])

  useEffect(() => {
    if (focusIndexRef.current === null) return
    const nextIndex = focusIndexRef.current
    focusIndexRef.current = null
    skipDeactivateRef.current = true
    cancelDeactivate()
    setActiveIndex(nextIndex)
  }, [blocks, cancelDeactivate])

  useEffect(() => {
    if (activeIndex === null) return

    skipDeactivateRef.current = true
    const timer = window.setTimeout(() => {
      skipDeactivateRef.current = false
    }, 200)
    return () => {
      window.clearTimeout(timer)
    }
  }, [activeIndex])

  useEffect(() => {
    const body = bodyRef.current
    if (!body) return

    const onFocusIn = () => {
      skipDeactivateRef.current = true
      cancelDeactivate()
    }

    const onFocusOut = (event: FocusEvent) => {
      const next = event.relatedTarget as Node | null
      if (next && body.contains(next)) return
      if (skipDeactivateRef.current) return

      const leavingTextarea = (event.target as HTMLElement | null)?.tagName === 'TEXTAREA'
      if (!leavingTextarea) return

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (skipDeactivateRef.current) return
          const active = document.activeElement
          if (body.contains(active) && active?.tagName === 'TEXTAREA') return
          scheduleDeactivate()
        })
      })
    }

    body.addEventListener('focusin', onFocusIn)
    body.addEventListener('focusout', onFocusOut)

    return () => {
      body.removeEventListener('focusin', onFocusIn)
      body.removeEventListener('focusout', onFocusOut)
      cancelDeactivate()
    }
  }, [cancelDeactivate, persistIfDrafts, scheduleDeactivate])

  useEffect(() => {
    const body = bodyRef.current
    if (!body) return

    let raf = 0
    const measure = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const cardElement = cardRef.current
        if (!cardElement) return
        blocksRef.current.forEach((block) => {
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
    blockRefs.current.forEach((element) => observer.observe(element))

    const scrollEl = body.closest('.card__body')
    scrollEl?.addEventListener('scroll', measure, { passive: true })

    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
      scrollEl?.removeEventListener('scroll', measure)
    }
  }, [blocks, cardRef, viewportZoom])

  useEffect(() => {
    return () => {
      const nextContent = serializeSegments(getWorkingSegments())
      const stored = serializeSegments(blocksRef.current)
      if (emptyDraftRef.current.trim() && blocksRef.current.length === 0) {
        onChangeRef.current(emptyDraftRef.current)
      } else if (nextContent !== stored) {
        onChangeRef.current(nextContent)
      }
    }
  }, [cardId, getWorkingSegments])

  const getSource = useCallback(
    (index: number, block: Segment) => {
      const raw = draftByIndex[index] ?? block.source
      return toEditorSource(raw)
    },
    [draftByIndex],
  )

  const handleActivate = useCallback(
    (index: number) => {
      skipDeactivateRef.current = true
      cancelDeactivate()
      setActiveIndex(index)
    },
    [cancelDeactivate],
  )

  const handleSourceChange = useCallback((index: number, source: string) => {
    setDraftByIndex((prev) => {
      const next = { ...prev, [index]: source }
      draftRef.current = next
      return next
    })
  }, [])

  const handleEnter = useCallback(
    (index: number, cursorOffset: number) => {
      skipDeactivateRef.current = true
      cancelDeactivate()

      const segments = getWorkingSegments()
      const block = segments[index]
      if (!block) return

      const editorSource = toEditorSource(block.source)
      const atEnd = cursorOffset >= editorSource.length

      const nextContent = atEnd
        ? insertSegmentAfter(segments, block.id, '')
        : splitSegmentAt(segments, block.id, cursorOffset)
      const nextBlocks = parseSegments(cardId, nextContent)
      const newIndex = findInsertedBlockIndex(segments, nextBlocks, index)

      setDraftByIndex((prev) => {
        const shifted = shiftDraftsAfterInsert(prev, index)
        delete shifted[index]
        delete shifted[newIndex]
        draftRef.current = shifted
        return shifted
      })

      skipDeactivateRef.current = true
      cancelDeactivate()
      focusIndexRef.current = newIndex
      setActiveIndex(newIndex)
      onChange(nextContent)
    },
    [cancelDeactivate, cardId, getWorkingSegments, onChange],
  )

  const handleBackspaceEmpty = useCallback(
    (index: number) => {
      skipDeactivateRef.current = true
      cancelDeactivate()

      const segments = getWorkingSegments()
      const block = segments[index]
      if (!block) return

      const emptiedSegments = segments.map((segment) =>
        segment.id === block.id ? { ...segment, source: '' } : segment,
      )
      const result = removeSegmentIfEmpty(emptiedSegments, block.id)

      if (result === null) {
        setDraftByIndex((prev) => {
          const next = { ...prev, [index]: '' }
          draftRef.current = next
          return next
        })
        onChange(updateSegmentSource(segments, block.id, ''))
        return
      }

      const nextActiveIndex = index > 0 ? index - 1 : 0

      setDraftByIndex((prev) => {
        const shifted = shiftDraftsAfterRemove(prev, index)
        draftRef.current = shifted
        return shifted
      })

      skipDeactivateRef.current = true
      cancelDeactivate()
      focusIndexRef.current = nextActiveIndex
      setActiveIndex(nextActiveIndex)
      onChange(result)
    },
    [cancelDeactivate, getWorkingSegments, onChange],
  )

  const commitEmptyDraft = useCallback(() => {
    skipDeactivateRef.current = true
    cancelDeactivate()
    const draft = emptyDraftRef.current
    const nextContent = draft.trim()
      ? draft
      : serializeSegments([
          {
            ...EMPTY_BLOCK,
            id: `${cardId}:paragraph:0`,
            source: placeholderEmptySource(''),
          },
        ])
    focusIndexRef.current = 0
    setEmptyDraft('')
    setActiveIndex(0)
    onChange(nextContent)
  }, [cancelDeactivate, cardId, onChange])

  if (blocks.length === 0) {
    return (
      <div ref={bodyRef} className="md-preview md-preview--blocks md-preview--typora">
        <div className="md-block md-block--paragraph">
          <TyporaBlock
            block={{ ...EMPTY_BLOCK, source: emptyDraft }}
            isActive
            onActivate={() => undefined}
            onSourceChange={setEmptyDraft}
            onEnter={() => commitEmptyDraft()}
            onBackspaceEmpty={() => undefined}
          />
        </div>
        {!emptyDraft && (
          <div className="md-block__hint">单击段落编辑 · Enter 新段落 · Shift+Enter 换行 · 右键设置端口</div>
        )}
      </div>
    )
  }

  return (
    <div ref={bodyRef} className="md-preview md-preview--blocks md-preview--typora">
      {blocks.map((block, index) => {
        const displayBlock = { ...block, source: getSource(index, block) }
        return (
          <div
            key={index}
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
            <TyporaBlock
              block={displayBlock}
              isActive={activeIndex === index}
              onActivate={() => handleActivate(index)}
              onSourceChange={(source) => handleSourceChange(index, source)}
              onEnter={(offset) => handleEnter(index, offset)}
              onBackspaceEmpty={() => handleBackspaceEmpty(index)}
            />
          </div>
        )
      })}
      <div className="md-block__hint">单击段落编辑 · Enter 新段落 · Shift+Enter 换行 · 右键设置端口</div>
    </div>
  )
}
