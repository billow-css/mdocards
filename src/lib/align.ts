import type { Card } from '../types'

export type AlignMode =
  | 'left'
  | 'center-h'
  | 'right'
  | 'top'
  | 'center-v'
  | 'bottom'
  | 'distribute-h'
  | 'distribute-v'

function selectedCards(cards: Card[], ids: string[]): Card[] {
  const set = new Set(ids)
  return cards.filter((card) => set.has(card.id))
}

export function alignCards(cards: Card[], ids: string[], mode: AlignMode): Card[] {
  const picked = selectedCards(cards, ids)
  if (picked.length < 2 && !mode.startsWith('distribute')) return cards
  if (picked.length < 3 && mode.startsWith('distribute')) return cards

  const byId = new Map(picked.map((card) => [card.id, card]))
  const apply = (id: string, patch: Partial<Card>) => {
    const card = byId.get(id)
    if (card) byId.set(id, { ...card, ...patch })
  }

  const left = Math.min(...picked.map((c) => c.position.x))
  const right = Math.max(...picked.map((c) => c.position.x + c.size.width))
  const top = Math.min(...picked.map((c) => c.position.y))
  const bottom = Math.max(...picked.map((c) => c.position.y + c.size.height))
  const centerX = (left + right) / 2
  const centerY = (top + bottom) / 2

  for (const card of picked) {
    switch (mode) {
      case 'left':
        apply(card.id, { position: { ...card.position, x: left } })
        break
      case 'right':
        apply(card.id, { position: { ...card.position, x: right - card.size.width } })
        break
      case 'center-h':
        apply(card.id, { position: { ...card.position, x: centerX - card.size.width / 2 } })
        break
      case 'top':
        apply(card.id, { position: { ...card.position, y: top } })
        break
      case 'bottom':
        apply(card.id, { position: { ...card.position, y: bottom - card.size.height } })
        break
      case 'center-v':
        apply(card.id, { position: { ...card.position, y: centerY - card.size.height / 2 } })
        break
      default:
        break
    }
  }

  if (mode === 'distribute-h' || mode === 'distribute-v') {
    const sorted = [...picked].sort((a, b) =>
      mode === 'distribute-h' ? a.position.x - b.position.x : a.position.y - b.position.y,
    )
    const first = sorted[0]!
    const last = sorted[sorted.length - 1]!
    const span =
      mode === 'distribute-h'
        ? last.position.x + last.size.width - first.position.x
        : last.position.y + last.size.height - first.position.y
    const totalSize = sorted.reduce(
      (sum, card) => sum + (mode === 'distribute-h' ? card.size.width : card.size.height),
      0,
    )
    const gap = (span - totalSize) / (sorted.length - 1)
    let cursor = mode === 'distribute-h' ? first.position.x : first.position.y

    for (const card of sorted) {
      if (mode === 'distribute-h') {
        apply(card.id, { position: { ...card.position, x: cursor } })
        cursor += card.size.width + gap
      } else {
        apply(card.id, { position: { ...card.position, y: cursor } })
        cursor += card.size.height + gap
      }
    }
  }

  const patchMap = new Map([...byId.entries()])
  return cards.map((card) => patchMap.get(card.id) ?? card)
}
