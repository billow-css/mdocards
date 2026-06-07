import { useCallback, useLayoutEffect, useRef } from 'react'
import type { Segment } from '../types'
import { isEffectivelyEmptySource } from '../lib/segments'
import { MarkdownRender } from './MarkdownRender'

interface TyporaBlockProps {
  block: Segment
  isActive: boolean
  onActivate: () => void
  onSourceChange: (source: string) => void
  onEnter: (cursorOffset: number) => void
  onBackspaceEmpty: () => void
}

function headingLevel(source: string): number {
  const match = source.match(/^(#{1,6})\s/)
  return match ? match[1].length : 0
}

function autoResize(textarea: HTMLTextAreaElement) {
  const scrollTop = textarea.scrollTop
  textarea.style.height = '0px'
  const next = textarea.scrollHeight
  textarea.style.height = `${next}px`
  textarea.scrollTop = scrollTop
}

export function TyporaBlock({
  block,
  isActive,
  onActivate,
  onSourceChange,
  onEnter,
  onBackspaceEmpty,
}: TyporaBlockProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const activatedRef = useRef(false)
  const level =
    block.kind === 'heading' ? headingLevel(block.source) : headingLevel(block.source)
  const editorValue = isEffectivelyEmptySource(block.source) ? '' : block.source

  useLayoutEffect(() => {
    const textarea = textareaRef.current
    if (!isActive || !textarea) {
      activatedRef.current = false
      return
    }

    if (!activatedRef.current) {
      textarea.focus()
      const value = isEffectivelyEmptySource(textarea.value) ? '' : textarea.value
      const end = value.length
      textarea.setSelectionRange(end, end)
      activatedRef.current = true
    }

    autoResize(textarea)
  }, [isActive, block.id])

  useLayoutEffect(() => {
    const textarea = textareaRef.current
    if (!isActive || !textarea) return
    autoResize(textarea)
  }, [editorValue, isActive])

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const textarea = event.currentTarget

      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault()
        event.stopPropagation()
        onEnter(textarea.selectionStart)
        return
      }

      if (event.key === 'Backspace' && textarea.selectionStart === 0 && textarea.selectionEnd === 0) {
        if (textarea.value === '' || isEffectivelyEmptySource(textarea.value)) {
          event.preventDefault()
          onBackspaceEmpty()
        }
      }

      if (event.key === 'Escape') {
        event.preventDefault()
        textarea.blur()
      }
    },
    [onBackspaceEmpty, onEnter],
  )

  const mirrorClass = level > 0 ? `typora-block__input--h${Math.min(level, 4)}` : ''
  const blockClass = [
    'typora-block',
    `typora-block--${block.kind}`,
    isActive ? 'typora-block--active typora-block--editing' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const renderSource = block.source.trim() ? block.source : ' '

  if (!isActive) {
    return (
      <div
        className={blockClass}
        onPointerDown={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onActivate()
        }}
      >
        <MarkdownRender content={renderSource} className="typora-block__render md-preview" />
      </div>
    )
  }

  const inputClass = ['typora-block__input', 'typora-block__input--visible', mirrorClass]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={blockClass} onPointerDown={(e) => e.stopPropagation()}>
      <textarea
        ref={textareaRef}
        className={inputClass}
        value={editorValue}
        spellCheck={false}
        rows={1}
        onChange={(e) => {
          onSourceChange(e.target.value)
          autoResize(e.target)
        }}
        onKeyDown={handleKeyDown}
      />
    </div>
  )
}
