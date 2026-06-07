import type { Card, CardGroup, Edge } from './graph'
import type { Viewport } from './editor'

/** 持久化 schema 版本，用于未来迁移 */
export const DOCUMENT_SCHEMA_VERSION = 1

/**
 * 可序列化的文档快照（导出/导入/localStorage）。
 * 不含 UI 瞬态状态（ports、connectingFrom 等）。
 */
export interface EditorDocument {
  version: typeof DOCUMENT_SCHEMA_VERSION
  cards: Card[]
  edges: Edge[]
  groups?: CardGroup[]
  viewport: Viewport
}
