import { useEditorStore } from '../store/useEditorStore'
import './SidebarPanel.css'

export function SidebarPanel() {
  const sidebarOpen = useEditorStore((s) => s.sidebarOpen)
  const cards = useEditorStore((s) => s.cards)
  const groups = useEditorStore((s) => s.groups)
  const selectedCardIds = useEditorStore((s) => s.selectedCardIds)
  const selectCards = useEditorStore((s) => s.selectCards)
  const focusCard = useEditorStore((s) => s.focusCard)
  const toggleSidebar = useEditorStore((s) => s.toggleSidebar)

  if (!sidebarOpen) return null

  return (
    <aside className="sidebar-panel">
      <div className="sidebar-panel__header">
        <span>大纲</span>
        <button type="button" className="sidebar-panel__close" onClick={toggleSidebar} aria-label="关闭侧栏">
          ×
        </button>
      </div>
      <div className="sidebar-panel__body">
        {groups.length > 0 && (
          <section className="sidebar-panel__section">
            <h3>组合</h3>
            <ul>
              {groups.map((group) => (
                <li key={group.id}>
                  <button
                    type="button"
                    className="sidebar-panel__item"
                    onClick={() => selectCards(group.cardIds)}
                  >
                    <span className="sidebar-panel__item-title">{group.title}</span>
                    <span className="sidebar-panel__item-meta">{group.cardIds.length}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
        <section className="sidebar-panel__section">
          <h3>卡片</h3>
          <ul>
            {cards.map((card) => (
              <li key={card.id}>
                <button
                  type="button"
                  className={[
                    'sidebar-panel__item',
                    selectedCardIds.includes(card.id) ? 'sidebar-panel__item--active' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => focusCard(card.id)}
                >
                  <span className="sidebar-panel__item-title">{card.title.trim() || '无标题'}</span>
                  <span className="sidebar-panel__item-meta">{card.id.slice(0, 4)}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </aside>
  )
}
