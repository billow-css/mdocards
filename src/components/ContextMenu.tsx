import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useMenuPosition } from '../hooks/useMenuPosition'
import './ContextMenu.css'

interface ContextMenuProps {
  x: number
  y: number
  onClose: () => void
  children: ReactNode
}

export function ContextMenu({ x, y, onClose, children }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null)

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
      className="context-menu"
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
    </div>,
    document.body,
  )
}

interface ContextMenuItemProps {
  label: string
  hint?: ReactNode
  leading?: ReactNode
  disabled?: boolean
  danger?: boolean
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void
}

export function ContextMenuItem({ label, hint, leading, disabled, danger, onClick }: ContextMenuItemProps) {
  return (
    <button
      type="button"
      className={[
        'context-menu__item',
        danger ? 'context-menu__item--danger' : '',
        disabled ? 'context-menu__item--disabled' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation()
        onClick?.(event)
      }}
    >
      {leading ? <span className="context-menu__leading">{leading}</span> : null}
      <span className="context-menu__label">{label}</span>
      {hint ? <span className="context-menu__hint">{hint}</span> : null}
    </button>
  )
}

export function ContextMenuDivider() {
  return <div className="context-menu__divider" role="separator" />
}

interface ContextMenuSubmenuProps {
  label: string
  children: ReactNode
}

export function ContextMenuSubmenu({ label, children }: ContextMenuSubmenuProps) {
  return (
    <div
      className="context-menu__submenu-wrap"
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="context-menu__item context-menu__item--submenu">
        <span className="context-menu__label">{label}</span>
        <span className="context-menu__arrow">›</span>
      </div>
      <div
        className="context-menu context-menu--sub"
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}
