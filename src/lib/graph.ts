import type { AnchorOverride, Card, Edge, Segment } from '../types'
import { getCardAnchorId, parseSegments, resolveAnchorSettings } from './segments'

export function portKey(cardId: string, anchorId: string, kind: 'prev' | 'next'): string {
  return `${cardId}:${anchorId}:${kind}`
}

/** 收集卡片上当前有效的 anchorId 集合 */
export function collectValidAnchorIds(card: Card): Set<string> {
  const ids = new Set<string>([getCardAnchorId(card.id)])
  for (const segment of parseSegments(card.id, card.content)) {
    ids.add(segment.id)
  }
  return ids
}

/** 判断某 anchor 在当前卡片状态下是否启用了指定端口 */
export function isAnchorPortActive(
  card: Card,
  anchorId: string,
  kind: 'prev' | 'next',
): boolean {
  const cardAnchorId = getCardAnchorId(card.id)
  if (anchorId === cardAnchorId) {
    return resolveAnchorSettings(
      { id: cardAnchorId, defaultPrev: true, defaultNext: true },
      card.anchorOverrides ?? {},
    )[kind === 'prev' ? 'isPrev' : 'isNext']
  }

  const segment = parseSegments(card.id, card.content).find((s) => s.id === anchorId)
  if (!segment) return false
  return resolveAnchorSettings(segment, card.anchorOverrides ?? {})[kind === 'prev' ? 'isPrev' : 'isNext']
}

/** next → prev 连接是否合法 */
export function isValidConnection(
  cards: Card[],
  sourceCardId: string,
  sourceAnchorId: string,
  targetCardId: string,
  targetAnchorId: string,
): boolean {
  if (sourceCardId === targetCardId && sourceAnchorId === targetAnchorId) return false

  const sourceCard = cards.find((c) => c.id === sourceCardId)
  const targetCard = cards.find((c) => c.id === targetCardId)
  if (!sourceCard || !targetCard) return false

  return (
    isAnchorPortActive(sourceCard, sourceAnchorId, 'next') &&
    isAnchorPortActive(targetCard, targetAnchorId, 'prev')
  )
}

/** 移除引用已删除卡片或无效 anchor 的边 */
export function pruneOrphanEdges(cards: Card[], edges: Edge[]): Edge[] {
  const cardMap = new Map(cards.map((c) => [c.id, c]))
  return edges.filter((edge) => {
    const source = cardMap.get(edge.sourceCardId)
    const target = cardMap.get(edge.targetCardId)
    if (!source || !target) return false
    return (
      isAnchorPortActive(source, edge.sourceAnchorId, 'next') &&
      isAnchorPortActive(target, edge.targetAnchorId, 'prev')
    )
  })
}

/** 删除卡片时，移除相关边与端口缓存 key */
export function edgesForCard(edges: Edge[], cardId: string): Edge[] {
  return edges.filter((e) => e.sourceCardId !== cardId && e.targetCardId !== cardId)
}

export function filterPortsForCard(
  ports: Record<string, { cardId: string }>,
  cardId: string,
): Record<string, { cardId: string }> {
  return Object.fromEntries(Object.entries(ports).filter(([, port]) => port.cardId !== cardId))
}

/** 内容变更后清理失效的 anchorOverrides */
export function pruneAnchorOverrides(
  card: Card,
  segments: Segment[],
): Record<string, AnchorOverride> {
  const valid = new Set<string>([getCardAnchorId(card.id), ...segments.map((s) => s.id)])
  return Object.fromEntries(
    Object.entries(card.anchorOverrides).filter(([id]) => valid.has(id)),
  )
}
