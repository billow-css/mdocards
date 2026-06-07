import type { ReactNode } from 'react'
import './ToolbarIconButton.css'

interface ToolbarIconButtonProps {
  icon: ReactNode
  label: string
  onClick?: () => void
  variant?: 'default' | 'primary' | 'danger'
  disabled?: boolean
}

export function ToolbarIconButton({
  icon,
  label,
  onClick,
  variant = 'default',
  disabled = false,
}: ToolbarIconButtonProps) {
  return (
    <button
      type="button"
      className={[
        'toolbar-icon-btn',
        variant !== 'default' ? `toolbar-icon-btn--${variant}` : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
    >
      {icon}
    </button>
  )
}
