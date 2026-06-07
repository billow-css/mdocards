/** 卡片级锚点 id（整张卡片一个 prev + 一个 next） */
export function getCardAnchorId(cardId: string): string {
  return `${cardId}:card:0`
}
