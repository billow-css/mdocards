import MarkdownIt from 'markdown-it'
import type Token from 'markdown-it/lib/token.mjs'
import type { Segment, SegmentKind } from '../types'
import {
  inferSegmentKind,
  isDisplayMathBlock,
  segmentPortDefaults,
  segmentPreview,
} from './segmentRules'

function isEffectivelyEmptySource(source: string): boolean {
  const trimmed = source.trim()
  return trimmed === '' || trimmed === '\u00a0'
}

const md = new MarkdownIt({ html: true, linkify: true })

function makeSegmentId(cardId: string, index: number, kind: SegmentKind): string {
  return `${cardId}:${kind}:${index}`
}

/** markdown-it 的 map 是 [起始行, 结束行)，不是字符偏移；close token 的 map 常为 null */
function tokenRange(markdown: string, open: Token, close: Token): string {
  const startLine = open.map?.[0] ?? 0
  const endLine = close.map?.[1] ?? open.map?.[1] ?? startLine + 1
  const lines = markdown.split('\n')
  return lines.slice(startLine, endLine).join('\n').trimEnd()
}

function findPair(tokens: Token[], openIndex: number, openType: string, closeType: string): number {
  let depth = 1
  for (let i = openIndex + 1; i < tokens.length; i++) {
    if (tokens[i].type === openType) depth++
    if (tokens[i].type === closeType) {
      depth--
      if (depth === 0) return i
    }
  }
  return openIndex
}

function pushSegment(
  segments: Segment[],
  cardId: string,
  index: number,
  kind: SegmentKind,
  source: string,
): number {
  const normalized = source.trimEnd()
  const resolvedKind = kind === 'paragraph' && isDisplayMathBlock(normalized) ? 'math' : kind
  segments.push({
    id: makeSegmentId(cardId, index, resolvedKind),
    kind: resolvedKind,
    source: normalized,
    preview: segmentPreview(normalized),
    ...segmentPortDefaults(resolvedKind),
  })
  return index + 1
}

/** 提取列表项的直接内容（不含嵌套子列表），并递归处理子列表 */
function parseListItems(
  tokens: Token[],
  markdown: string,
  listOpenIndex: number,
  cardId: string,
  segmentIndex: number,
  segments: Segment[],
): { nextIndex: number; nextSegmentIndex: number } {
  const ordered = tokens[listOpenIndex].type === 'ordered_list_open'
  const listCloseType = ordered ? 'ordered_list_close' : 'bullet_list_close'
  const listCloseIndex = findPair(tokens, listOpenIndex, tokens[listOpenIndex].type, listCloseType)

  let itemNumber = 1
  let i = listOpenIndex + 1

  while (i < listCloseIndex) {
    if (tokens[i].type !== 'list_item_open') {
      i++
      continue
    }

    const itemCloseIndex = findPair(tokens, i, 'list_item_open', 'list_item_close')
    const prefix = ordered ? `${itemNumber}. ` : '- '

    let inlineContent = ''
    for (let j = i + 1; j < itemCloseIndex; j++) {
      if (
        tokens[j].type === 'bullet_list_open' ||
        tokens[j].type === 'ordered_list_open'
      ) {
        const nested = parseListItems(tokens, markdown, j, cardId, segmentIndex, segments)
        segmentIndex = nested.nextSegmentIndex
        j = nested.nextIndex - 1
        continue
      }
      if (tokens[j].type === 'inline' && !inlineContent) {
        inlineContent = tokens[j].content
      }
      if (tokens[j].type === 'paragraph_open') {
        const inline = tokens[j + 1]
        if (inline?.type === 'inline') inlineContent = inline.content
      }
    }

    const itemClose = tokens[itemCloseIndex]
    const itemOpen = tokens[i]
    let source = tokenRange(markdown, itemOpen, itemClose)

    const firstLine = source.split('\n')[0] ?? ''
    if (/^[-*+]\s/.test(firstLine.trim()) || /^\d+\.\s/.test(firstLine.trim())) {
      source = firstLine.trimEnd()
    } else {
      source = `${prefix}${inlineContent}`
    }

    segmentIndex = pushSegment(segments, cardId, segmentIndex, 'list-item', source)
    if (ordered) itemNumber++
    i = itemCloseIndex + 1
  }

  return { nextIndex: listCloseIndex + 1, nextSegmentIndex: segmentIndex }
}

function parseBlockquote(
  tokens: Token[],
  markdown: string,
  openIndex: number,
  cardId: string,
  segmentIndex: number,
  segments: Segment[],
): { nextIndex: number; nextSegmentIndex: number } {
  const closeIndex = findPair(tokens, openIndex, 'blockquote_open', 'blockquote_close')
  const source = tokenRange(markdown, tokens[openIndex], tokens[closeIndex])
  segmentIndex = pushSegment(segments, cardId, segmentIndex, 'blockquote', source)
  return { nextIndex: closeIndex + 1, nextSegmentIndex: segmentIndex }
}

function parseHeading(
  tokens: Token[],
  markdown: string,
  openIndex: number,
  cardId: string,
  segmentIndex: number,
  segments: Segment[],
): { nextIndex: number; nextSegmentIndex: number } {
  const closeIndex = openIndex + 2
  const source = tokenRange(markdown, tokens[openIndex], tokens[closeIndex])
  segmentIndex = pushSegment(segments, cardId, segmentIndex, 'heading', source)
  return { nextIndex: closeIndex + 1, nextSegmentIndex: segmentIndex }
}

function parseParagraph(
  tokens: Token[],
  markdown: string,
  openIndex: number,
  cardId: string,
  segmentIndex: number,
  segments: Segment[],
): { nextIndex: number; nextSegmentIndex: number } {
  const closeIndex = openIndex + 2
  const source = tokenRange(markdown, tokens[openIndex], tokens[closeIndex])
  const kind = isDisplayMathBlock(source) ? 'math' : 'paragraph'
  segmentIndex = pushSegment(segments, cardId, segmentIndex, kind, source)
  return { nextIndex: closeIndex + 1, nextSegmentIndex: segmentIndex }
}

/** 将卡片 Markdown 源码解析为段落列表 */
export function parseSegmentsFromMarkdown(cardId: string, markdown: string): Segment[] {
  if (markdown === '') return []

  if (isEffectivelyEmptySource(markdown)) {
    return [
      {
        id: makeSegmentId(cardId, 0, 'paragraph'),
        kind: 'paragraph',
        source: '\u00a0',
        preview: '',
        ...segmentPortDefaults('paragraph'),
      },
    ]
  }

  const tokens = md.parse(markdown, {})
  const segments: Segment[] = []
  let segmentIndex = 0

  for (let i = 0; i < tokens.length; ) {
    const token = tokens[i]

    if (token.type === 'heading_open') {
      const result = parseHeading(tokens, markdown, i, cardId, segmentIndex, segments)
      segmentIndex = result.nextSegmentIndex
      i = result.nextIndex
      continue
    }

    if (token.type === 'paragraph_open') {
      const result = parseParagraph(tokens, markdown, i, cardId, segmentIndex, segments)
      segmentIndex = result.nextSegmentIndex
      i = result.nextIndex
      continue
    }

    if (token.type === 'fence' || token.type === 'code_block') {
      const source =
        token.type === 'fence'
          ? `\`\`\`${token.info.trim()}\n${token.content.replace(/\n$/, '')}\n\`\`\``
          : token.content.endsWith('\n')
            ? token.content.slice(0, -1)
            : token.content
      segmentIndex = pushSegment(segments, cardId, segmentIndex, 'code', source)
      i += 1
      continue
    }

    if (token.type === 'blockquote_open') {
      const result = parseBlockquote(tokens, markdown, i, cardId, segmentIndex, segments)
      segmentIndex = result.nextSegmentIndex
      i = result.nextIndex
      continue
    }

    if (token.type === 'bullet_list_open' || token.type === 'ordered_list_open') {
      const result = parseListItems(tokens, markdown, i, cardId, segmentIndex, segments)
      segmentIndex = result.nextSegmentIndex
      i = result.nextIndex
      continue
    }

    if (token.type === 'hr') {
      segmentIndex = pushSegment(segments, cardId, segmentIndex, 'hr', '---')
      i += 1
      continue
    }

    if (token.type === 'table_open') {
      const closeIndex = findPair(tokens, i, 'table_open', 'table_close')
      const source = tokenRange(markdown, tokens[i], tokens[closeIndex])
      segmentIndex = pushSegment(segments, cardId, segmentIndex, 'paragraph', source)
      i = closeIndex + 1
      continue
    }

    if (token.type === 'html_block') {
      const source = token.content.trimEnd()
      const kind = inferSegmentKind(source)
      segmentIndex = pushSegment(segments, cardId, segmentIndex, kind, source)
      i += 1
      continue
    }

    i += 1
  }

  return segments
}
