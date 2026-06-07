import { useEffect } from 'react'
import { APP_DESCRIPTION, APP_NAME, APP_TAGLINE, APP_VERSION } from '../lib/appInfo'
import { isElectron } from '../lib/electronApi'
import { IconLogo } from './icons/ToolbarIcons'
import './AboutModal.css'

interface AboutModalProps {
  onClose: () => void
}

export function AboutModal({ onClose }: AboutModalProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className="about-modal__backdrop" onClick={onClose}>
      <div className="about-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="about-modal-title">
        <div className="about-modal__header">
          <h2 id="about-modal-title">关于 {APP_NAME}</h2>
          <button type="button" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </div>
        <div className="about-modal__body">
          <div className="about-modal__brand">
            <span className="about-modal__logo" aria-hidden>
              <IconLogo width={28} height={28} />
            </span>
            <div>
              <p className="about-modal__name">{APP_NAME}</p>
              <p className="about-modal__tagline">{APP_TAGLINE}</p>
            </div>
          </div>
          <p className="about-modal__description">{APP_DESCRIPTION}</p>
          <dl className="about-modal__meta">
            <div>
              <dt>版本</dt>
              <dd>{APP_VERSION}{isElectron() ? ' · 桌面版' : ''}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  )
}
