import type { Card, CardGroup, Position } from '../types'

export const TRAY_TITLE_HEIGHT = 28
export const TRAY_PADDING = 14

export interface TrayBounds {
  x: number
  y: number
  width: number
  height: number
}

export interface WorldRect {
  x: number
  y: number
  width: number
  height: number
}

export function cardRect(card: Card): WorldRect {
  return {
    x: card.position.x,
    y: card.position.y,
    width: card.size.width,
    height: card.size.height,
  }
}

export function normalizeRect(x1: number, y1: number, x2: number, y2: number): WorldRect {
  const left = Math.min(x1, x2)
  const top = Math.min(y1, y2)
  return {
    x: left,
    y: top,
    width: Math.abs(x2 - x1),
    height: Math.abs(y2 - y1),
  }
}

export function rectsIntersect(a: WorldRect, b: WorldRect): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  )
}

export function computeTrayBounds(cards: Card[], cardIds: string[]): TrayBounds | null {
  const members = cards.filter((card) => cardIds.includes(card.id))
  if (members.length === 0) return null

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const card of members) {
    minX = Math.min(minX, card.position.x)
    minY = Math.min(minY, card.position.y)
    maxX = Math.max(maxX, card.position.x + card.size.width)
    maxY = Math.max(maxY, card.position.y + card.size.height)
  }

  return {
    x: minX - TRAY_PADDING,
    y: minY - TRAY_PADDING - TRAY_TITLE_HEIGHT,
    width: maxX - minX + TRAY_PADDING * 2,
    height: maxY - minY + TRAY_PADDING * 2 + TRAY_TITLE_HEIGHT,
  }
}

export function sanitizeGroups(groups: CardGroup[], cards: Card[]): CardGroup[] {
  const cardSet = new Set(cards.map((card) => card.id))
  return groups
    .map((group) => ({
      ...group,
      cardIds: group.cardIds.filter((id) => cardSet.has(id)),
    }))
    .filter((group) => group.cardIds.length >= 2)
}

export function removeCardsFromGroups(
  groups: CardGroup[],
  removedCardIds: string[],
  allCards: Card[],
): CardGroup[] {
  const removeSet = new Set(removedCardIds)
  return sanitizeGroups(
    groups.map((group) => ({
      ...group,
      cardIds: group.cardIds.filter((id) => !removeSet.has(id)),
    })),
    allCards,
  )
}

/** 从现有组合中移除指定卡片，并过滤掉不足 2 张的组合 */
export function detachCardsFromGroups(groups: CardGroup[], cardIds: string[]): CardGroup[] {
  const detach = new Set(cardIds)
  const next = groups
    .map((group) => ({
      ...group,
      cardIds: group.cardIds.filter((id) => !detach.has(id)),
    }))
    .filter((group) => group.cardIds.length >= 2)
  return next
}

export function moveCardsByDelta(cards: Card[], cardIds: string[], delta: Position): Card[] {
  const idSet = new Set(cardIds)
  return cards.map((card) =>
    idSet.has(card.id)
      ? {
          ...card,
          position: {
            x: card.position.x + delta.x,
            y: card.position.y + delta.y,
          },
        }
      : card,
  )
}

export function cardsInMarquee(cards: Card[], marquee: WorldRect): string[] {
  return cards.filter((card) => rectsIntersect(cardRect(card), marquee)).map((card) => card.id)
}
