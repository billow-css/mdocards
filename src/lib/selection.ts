import type { Card } from '../types'

export function toggleCardInSelection(selectedIds: string[], cardId: string): string[] {
  const set = new Set(selectedIds)
  if (set.has(cardId)) set.delete(cardId)
  else set.add(cardId)
  return [...set]
}

export function rangeSelectCards(cards: Card[], anchorId: string | null, targetId: string): string[] {
  if (!anchorId) return [targetId]
  const order = cards.map((c) => c.id)
  const a = order.indexOf(anchorId)
  const b = order.indexOf(targetId)
  if (a < 0 || b < 0) return [targetId]
  const [start, end] = a < b ? [a, b] : [b, a]
  return order.slice(start, end + 1)
}

export function searchCards(cards: Card[], query: string): Card[] {
  const q = query.trim().toLowerCase()
  if (!q) return cards
  return cards.filter(
    (card) =>
      card.title.toLowerCase().includes(q) ||
      card.content.toLowerCase().includes(q) ||
      card.id.toLowerCase().includes(q),
  )
}
