import type { AnchorOverride, Segment } from '../types'
import { CARD_TITLEBAR_HEIGHT } from '../types/constants'
import { getCardAnchorId, resolveAnchorSettings } from './segments'

export interface VisibleAnchor {
  anchorId: string
  y: number
  isPrev: boolean
  isNext: boolean
  preview: string
  defaultPrev: boolean
  defaultNext: boolean
}

export function getVisibleAnchors(
  cardId: string,
  _cardHeight: number,
  blockCenters: Record<string, number>,
  segments: Segment[],
  anchorOverrides: Record<string, Partial<AnchorOverride>>,
): VisibleAnchor[] {
  const cardAnchorId = getCardAnchorId(cardId)
  const cardSettings = resolveAnchorSettings(
    { id: cardAnchorId, defaultPrev: true, defaultNext: true },
    anchorOverrides,
  )

  const anchors: VisibleAnchor[] = [
    {
      anchorId: cardAnchorId,
      y: CARD_TITLEBAR_HEIGHT / 2,
      isPrev: cardSettings.isPrev,
      isNext: cardSettings.isNext,
      preview: '卡片级端口',
      defaultPrev: true,
      defaultNext: true,
    },
  ]

  for (const segment of segments) {
    const settings = resolveAnchorSettings(segment, anchorOverrides)
    if (!settings.isPrev && !settings.isNext) continue
    const y = blockCenters[segment.id]
    if (y === undefined) continue
    anchors.push({
      anchorId: segment.id,
      y,
      isPrev: settings.isPrev,
      isNext: settings.isNext,
      preview: segment.preview,
      defaultPrev: segment.defaultPrev,
      defaultNext: segment.defaultNext,
    })
  }

  return anchors
}

export function findAnchorMeta(
  cardId: string,
  anchorId: string,
  segments: Segment[],
): Pick<Segment, 'id' | 'kind' | 'defaultPrev' | 'defaultNext' | 'preview'> {
  const cardAnchorId = getCardAnchorId(cardId)
  if (anchorId === cardAnchorId) {
    return {
      id: cardAnchorId,
      kind: 'card',
      defaultPrev: true,
      defaultNext: true,
      preview: '卡片级端口',
    }
  }
  const segment = segments.find((item) => item.id === anchorId)
  return (
    segment ?? {
      id: anchorId,
      kind: 'paragraph',
      defaultPrev: false,
      defaultNext: false,
      preview: anchorId,
    }
  )
}
