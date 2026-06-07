/** @deprecated 请使用 ./segments */
export {
  parseSegments as parseMarkdownBlocks,
  serializeSegments as serializeBlocks,
  updateSegmentSource as updateBlockSource,
  segmentPortDefaults as blockDefaults,
  getCardAnchorId,
  resolveAnchorSettings,
  remapAnchorOverrides,
  parseSegments,
  serializeSegments,
  updateSegmentSource,
  inferSegmentKind,
  isDisplayMathBlock,
  SEGMENT_PORT_RULES,
} from './segments'
