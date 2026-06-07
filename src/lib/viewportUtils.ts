import type { Card, CardGroup, Viewport } from '../types'
import { computeTrayBounds } from './groups'

export const ZOOM_MIN = 0.2
export const ZOOM_MAX = 3

export function clampZoom(zoom: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom))
}

export function zoomAroundCenter(
  viewport: Viewport,
  containerWidth: number,
  containerHeight: number,
  factor: number,
): Viewport {
  const newZoom = clampZoom(viewport.zoom * factor)
  const cx = containerWidth / 2
  const cy = containerHeight / 2
  const wx = (cx - viewport.x) / viewport.zoom
  const wy = (cy - viewport.y) / viewport.zoom
  return {
    zoom: newZoom,
    x: cx - wx * newZoom,
    y: cy - wy * newZoom,
  }
}

export function computeContentBounds(cards: Card[], groups: CardGroup[]) {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const card of cards) {
    minX = Math.min(minX, card.position.x)
    minY = Math.min(minY, card.position.y)
    maxX = Math.max(maxX, card.position.x + card.size.width)
    maxY = Math.max(maxY, card.position.y + card.size.height)
  }

  for (const group of groups) {
    const bounds = computeTrayBounds(cards, group.cardIds)
    if (!bounds) continue
    minX = Math.min(minX, bounds.x)
    minY = Math.min(minY, bounds.y)
    maxX = Math.max(maxX, bounds.x + bounds.width)
    maxY = Math.max(maxY, bounds.y + bounds.height)
  }

  if (!Number.isFinite(minX)) {
    return { x: 0, y: 0, width: 800, height: 600 }
  }

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

export function viewportToFitContent(
  cards: Card[],
  groups: CardGroup[],
  containerWidth: number,
  containerHeight: number,
  padding = 80,
): Viewport {
  const bounds = computeContentBounds(cards, groups)
  const zoom = clampZoom(
    Math.min(
      (containerWidth - padding * 2) / Math.max(bounds.width, 1),
      (containerHeight - padding * 2) / Math.max(bounds.height, 1),
    ),
  )
  const x = (containerWidth - bounds.width * zoom) / 2 - bounds.x * zoom
  const y = (containerHeight - bounds.height * zoom) / 2 - bounds.y * zoom
  return { x, y, zoom }
}

export function panToCard(
  card: Card,
  viewport: Viewport,
  containerWidth: number,
  containerHeight: number,
): Viewport {
  const cx = card.position.x + card.size.width / 2
  const cy = card.position.y + card.size.height / 2
  return {
    ...viewport,
    x: containerWidth / 2 - cx * viewport.zoom,
    y: containerHeight / 2 - cy * viewport.zoom,
  }
}
