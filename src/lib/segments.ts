import type { AnchorOverride, Segment } from '../types'
import { parseSegmentsFromMarkdown } from './segmentParser'
import { inferSegmentKind, segmentPortDefaults, segmentPreview } from './segmentRules'

export { getCardAnchorId } from './segmentIds'
export {
  inferSegmentKind,
  isDisplayMathBlock,
  segmentPortDefaults,
  segmentPreview,
  SEGMENT_PORT_RULES,
} from './segmentRules'
export { parseSegmentsFromMarkdown }

/** 将卡片 Markdown 源码解析为段落列表 */
export function parseSegments(cardId: string, markdown: string): Segment[] {
  return parseSegmentsFromMarkdown(cardId, markdown)
}

export function serializeSegments(segments: Segment[]): string {
  if (segments.length === 0) return ''

  const parts: string[] = []
  let listBuffer: string[] = []

  const flushList = () => {
    if (listBuffer.length > 0) {
      parts.push(listBuffer.join('\n'))
      listBuffer = []
    }
  }

  for (const segment of segments) {
    if (segment.kind === 'list-item') {
      listBuffer.push(segment.source)
      continue
    }
    flushList()
    parts.push(segment.source)
  }

  flushList()
  return parts.join('\n\n')
}

/** 空段落在序列化后会被 markdown 解析吞掉，用不换行空格保留独立段落 */
export function placeholderEmptySource(source: string): string {
  return isEffectivelyEmptySource(source) ? '\u00a0' : source
}

/** 编辑区里的“空”：含仅含占位空格的段落 */
export function isEffectivelyEmptySource(source: string): boolean {
  const trimmed = source.trim()
  return trimmed === '' || trimmed === '\u00a0'
}

/** 占位空段落在 textarea 中显示为空字符串 */
export function toEditorSource(source: string): string {
  return isEffectivelyEmptySource(source) ? '' : source
}

export function insertSegmentAfter(
  segments: Segment[],
  segmentId: string,
  newSource = '',
): string {
  const index = segments.findIndex((s) => s.id === segmentId)
  if (index < 0) return serializeSegments(segments)

  const normalizedSource = placeholderEmptySource(newSource)
  const kind = inferSegmentKind(normalizedSource)
  const inserted: Segment = {
    id: `${segmentId}-new`,
    kind,
    source: normalizedSource,
    preview: segmentPreview(normalizedSource),
    ...segmentPortDefaults(kind),
  }

  const next = [...segments]
  next.splice(index + 1, 0, inserted)
  return serializeSegments(next)
}

export function splitSegmentAt(
  segments: Segment[],
  segmentId: string,
  offset: number,
): string {
  const index = segments.findIndex((s) => s.id === segmentId)
  if (index < 0) return serializeSegments(segments)

  const segment = segments[index]
  const before = segment.source.slice(0, offset)
  const after = placeholderEmptySource(segment.source.slice(offset))

  const normalizedBefore = placeholderEmptySource(before)
  const beforeKind = inferSegmentKind(normalizedBefore)
  const afterKind = inferSegmentKind(after)

  const next = [...segments]
  next[index] = {
    ...segment,
    kind: beforeKind,
    source: normalizedBefore,
    preview: segmentPreview(normalizedBefore),
    ...segmentPortDefaults(beforeKind),
  }
  next.splice(index + 1, 0, {
    id: `${segmentId}-split`,
    kind: afterKind,
    source: after,
    preview: segmentPreview(after),
    ...segmentPortDefaults(afterKind),
  })
  return serializeSegments(next)
}

export function removeSegmentIfEmpty(segments: Segment[], segmentId: string): string | null {
  const index = segments.findIndex((s) => s.id === segmentId)
  if (index < 0) return null
  if (!isEffectivelyEmptySource(segments[index].source)) return null
  if (segments.length <= 1) return ''

  const next = segments.filter((s) => s.id !== segmentId)
  return serializeSegments(next)
}

export function updateSegmentSource(segments: Segment[], segmentId: string, nextSource: string): string {
  const nextSegments = segments.map((segment) => {
    if (segment.id !== segmentId) return segment
    const normalizedSource = placeholderEmptySource(nextSource)
    const kind = inferSegmentKind(normalizedSource)
    return {
      ...segment,
      kind,
      source: normalizedSource,
      preview: segmentPreview(normalizedSource),
      ...segmentPortDefaults(kind),
    }
  })
  return serializeSegments(nextSegments)
}

/** 合并用户覆盖与段落默认端口设置 */
export function resolveAnchorSettings(
  segment: Pick<Segment, 'id' | 'defaultPrev' | 'defaultNext'>,
  overrides: Record<string, Partial<AnchorOverride>>,
): Required<AnchorOverride> {
  const override = overrides[segment.id] ?? {}
  return {
    isPrev: override.isPrev ?? segment.defaultPrev,
    isNext: override.isNext ?? segment.defaultNext,
  }
}

/**
 * 段落重解析后，按 kind+source 将旧的 anchorOverrides 迁移到新 id。
 * 段落 id 含索引，编辑后索引可能变化，需重新对齐。
 */
export function remapAnchorOverrides(
  prevSegments: Segment[],
  nextSegments: Segment[],
  overrides: Record<string, AnchorOverride>,
): Record<string, AnchorOverride> {
  if (Object.keys(overrides).length === 0) return overrides

  const fingerprint = (segment: Segment) => `${segment.kind}::${segment.source}`
  const prevByFp = new Map<string, string[]>()
  for (const segment of prevSegments) {
    const fp = fingerprint(segment)
    const list = prevByFp.get(fp) ?? []
    list.push(segment.id)
    prevByFp.set(fp, list)
  }

  const remapped: Record<string, AnchorOverride> = {}
  for (const segment of nextSegments) {
    const fp = fingerprint(segment)
    const oldIds = prevByFp.get(fp)
    if (!oldIds || oldIds.length === 0) continue
    const oldId = oldIds.shift()!
    if (oldIds.length === 0) prevByFp.delete(fp)
    else prevByFp.set(fp, oldIds)
    if (overrides[oldId]) remapped[segment.id] = overrides[oldId]
  }

  const cardLevel = Object.entries(overrides).find(([id]) => id.endsWith(':card:0'))
  if (cardLevel) remapped[cardLevel[0]] = cardLevel[1]

  return remapped
}

// 兼容旧命名
export const parseMarkdownBlocks = parseSegments
export const serializeBlocks = serializeSegments
export const updateBlockSource = updateSegmentSource
export const blockDefaults = segmentPortDefaults
