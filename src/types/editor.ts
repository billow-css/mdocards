import type { PortPosition } from './graph'

/** 画布视口变换 */
export interface Viewport {
  x: number
  y: number
  zoom: number
}

/** 从 next 端口开始拖拽时的起点 */
export interface ConnectingFrom {
  cardId: string
  anchorId: string
  x: number
  y: number
}

/**
 * 编辑器 UI 瞬态状态（不写入 localStorage）。
 * 与 Document 中的 cards/edges 分离。
 */
export type { ThemeMode } from '../lib/theme'

export interface EditorUIState {
  selectedCardId: string | null
  selectedEdgeId: string | null
  /** 运行时端口坐标缓存，key = `${cardId}:${anchorId}:${kind}` */
  ports: Record<string, PortPosition>
  connectingFrom: ConnectingFrom | null
  connectPointer: { x: number; y: number } | null
}
