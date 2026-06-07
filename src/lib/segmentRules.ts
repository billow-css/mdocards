import type { SegmentKind } from '../types'

/** 各段落类型的默认 prev/next 端口规则（与用户设计一致） */
export const SEGMENT_PORT_RULES: Record<
  SegmentKind,
  { defaultPrev: boolean; defaultNext: boolean; label: string }
> = {
  card: { defaultPrev: true, defaultNext: true, label: '卡片级' },
  'list-item': { defaultPrev: false, defaultNext: true, label: '列表项' },
  heading: { defaultPrev: false, defaultNext: false, label: '标题' },
  paragraph: { defaultPrev: false, defaultNext: false, label: '段落' },
  blockquote: { defaultPrev: false, defaultNext: false, label: '引用' },
  code: { defaultPrev: false, defaultNext: false, label: '代码块' },
  math: { defaultPrev: false, defaultNext: false, label: '公式块' },
  hr: { defaultPrev: false, defaultNext: false, label: '分隔线' },
}

export function segmentPortDefaults(kind: SegmentKind): {
  defaultPrev: boolean
  defaultNext: boolean
} {
  const rule = SEGMENT_PORT_RULES[kind]
  return { defaultPrev: rule.defaultPrev, defaultNext: rule.defaultNext }
}

/** 块级公式：$$...$$ 独占段落 */
export function isDisplayMathBlock(source: string): boolean {
  const trimmed = source.trim()
  if (!trimmed.startsWith('$$') || !trimmed.endsWith('$$')) return false
  if (trimmed.length <= 4) return false

  const lines = trimmed.split('\n')
  if (lines.length === 1) return true

  const first = lines[0].trim()
  const last = lines[lines.length - 1].trim()
  return first === '$$' && last === '$$'
}

/** 从单段源码推断语义类型（编辑保存时重新分类） */
export function inferSegmentKind(source: string): SegmentKind {
  const trimmed = source.trim()
  if (!trimmed) return 'paragraph'

  if (isDisplayMathBlock(trimmed)) return 'math'
  if (/^```[\s\S]*```$/.test(trimmed) || /^```/.test(trimmed)) return 'code'
  if (/^( {4}|\t)/m.test(trimmed) && !trimmed.includes('\n\n')) return 'code'
  if (/^#{1,6}\s+\S/.test(trimmed)) return 'heading'
  if (
    trimmed.split('\n').every((line) => /^>\s?/.test(line) || line.trim() === '')
  ) {
    return 'blockquote'
  }
  if (/^[-*+]\s/.test(trimmed)) return 'list-item'
  if (/^\d+\.\s/.test(trimmed)) return 'list-item'
  if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) return 'hr'

  return 'paragraph'
}

export function segmentPreview(text: string): string {
  const trimmed = text.trim()
  if (trimmed.length <= 40) return trimmed.replace(/\n/g, ' ')
  return `${trimmed.slice(0, 40).replace(/\n/g, ' ')}…`
}
