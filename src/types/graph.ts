/** 二维坐标 */
export interface Position {
  x: number
  y: number
}

/** 矩形尺寸 */
export interface Size {
  width: number
  height: number
}

/**
 * Markdown 段落的语义类型。
 * 每个「段」对应源码中一个独立块（两个换行之间），或列表中的一项。
 */
export type SegmentKind =
  | 'card'
  | 'heading'
  | 'paragraph'
  | 'list-item'
  | 'blockquote'
  | 'code'
  | 'math'
  | 'hr'

/**
 * 解析后的 Markdown 段落（Segment）。
 * 运行时由 `content` 解析得到，不单独持久化。
 */
export interface Segment {
  id: string
  kind: SegmentKind
  /** 该段落在卡片 content 中对应的 Markdown 源码 */
  source: string
  /** 右键菜单与端口 tooltip 用的摘要 */
  preview: string
  /** 默认是否暴露 prev 端口 */
  defaultPrev: boolean
  /** 默认是否暴露 next 端口 */
  defaultNext: boolean
}

/** 用户对某段落端口的手动覆盖（右键菜单设置） */
export interface AnchorOverride {
  isPrev?: boolean
  isNext?: boolean
}

/**
 * 卡片：编辑器中的基本单元。
 * 包含位置、尺寸、Markdown 源码，以及端口覆盖配置。
 */
export interface Card {
  id: string
  title: string
  /** 标题栏色相 0–360，饱和度/明度由全局主题决定 */
  titleHue: number
  position: Position
  size: Size
  /** 卡片内完整的 Markdown 源码 */
  content: string
  /** key = anchorId（段落 id 或卡片级 id），value = 端口覆盖 */
  anchorOverrides: Record<string, AnchorOverride>
}

/** 卡片组合托盘：包裹多张卡片，拖拽标题栏可整体移动 */
export interface CardGroup {
  id: string
  title: string
  cardIds: string[]
}

export type PortKind = 'prev' | 'next'

/**
 * 有向边：从 source 的 next 端口连到 target 的 prev 端口。
 * 同一端口允许多条出/入边。
 */
export interface Edge {
  id: string
  sourceCardId: string
  sourceAnchorId: string
  targetCardId: string
  targetAnchorId: string
}

/** 端口在画布世界坐标中的位置（运行时缓存，不持久化） */
export interface PortPosition {
  cardId: string
  anchorId: string
  kind: PortKind
  x: number
  y: number
}

/** @deprecated 使用 Segment */
export type BlockKind = SegmentKind

/** @deprecated 使用 Segment */
export type MdBlock = Segment

/** @deprecated 使用 AnchorOverride */
export type AnchorSettings = AnchorOverride
