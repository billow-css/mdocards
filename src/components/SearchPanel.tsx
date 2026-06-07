import { useMemo } from 'react'
import { searchCards } from '../lib/selection'
import { useEditorStore } from '../store/useEditorStore'
import './SearchPanel.css'

export function SearchPanel() {
  const searchOpen = useEditorStore((s) => s.searchOpen)
  const searchQuery = useEditorStore((s) => s.searchQuery)
  const cards = useEditorStore((s) => s.cards)
  const setSearchQuery = useEditorStore((s) => s.setSearchQuery)
  const setSearchOpen = useEditorStore((s) => s.setSearchOpen)
  const focusCard = useEditorStore((s) => s.focusCard)

  const results = useMemo(() => searchCards(cards, searchQuery), [cards, searchQuery])

  if (!searchOpen) return null

  return (
    <div className="search-panel">
      <div className="search-panel__header">
        <input
          className="search-panel__input"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="搜索标题或正文…"
          autoFocus
        />
        <button type="button" className="search-panel__close" onClick={() => setSearchOpen(false)}>
          Esc
        </button>
      </div>
      <ul className="search-panel__results">
        {results.length === 0 ? (
          <li className="search-panel__empty">无匹配结果</li>
        ) : (
          results.map((card) => (
            <li key={card.id}>
              <button
                type="button"
                className="search-panel__item"
                onClick={() => {
                  focusCard(card.id)
                  setSearchOpen(false)
                }}
              >
                <span className="search-panel__title">{card.title.trim() || '无标题'}</span>
                <span className="search-panel__preview">
                  {card.content.trim().slice(0, 80) || '（空内容）'}
                </span>
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  )
}
