import type { Card, Edge, PortPosition } from '../types'
import { portKey } from '../lib/graph'

export function selectCardById(cards: Card[], id: string | null): Card | undefined {
  if (!id) return undefined
  return cards.find((c) => c.id === id)
}

export function selectEdgesForCard(edges: Edge[], cardId: string): Edge[] {
  return edges.filter((e) => e.sourceCardId === cardId || e.targetCardId === cardId)
}

export function selectPort(
  ports: Record<string, PortPosition>,
  cardId: string,
  anchorId: string,
  kind: 'prev' | 'next',
): PortPosition | undefined {
  return ports[portKey(cardId, anchorId, kind)]
}

export function selectEdgeEndpoints(
  ports: Record<string, PortPosition>,
  edge: Edge,
): { source?: PortPosition; target?: PortPosition } {
  return {
    source: selectPort(ports, edge.sourceCardId, edge.sourceAnchorId, 'next'),
    target: selectPort(ports, edge.targetCardId, edge.targetAnchorId, 'prev'),
  }
}
