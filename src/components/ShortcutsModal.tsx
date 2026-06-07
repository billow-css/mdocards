import { SHORTCUTS } from '../lib/shortcuts'
import './ShortcutsModal.css'

interface ShortcutsModalProps {
  onClose: () => void
}

export function ShortcutsModal({ onClose }: ShortcutsModalProps) {
  return (
    <div className="shortcuts-modal__backdrop" onClick={onClose}>
      <div className="shortcuts-modal" onClick={(e) => e.stopPropagation()}>
        <div className="shortcuts-modal__header">
          <h2>快捷键</h2>
          <button type="button" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </div>
        <ul className="shortcuts-modal__list">
          {SHORTCUTS.map((item) => (
            <li key={item.keys}>
              <kbd>{item.keys}</kbd>
              <span>{item.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
