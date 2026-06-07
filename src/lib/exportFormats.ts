import type { Card, CardGroup, Edge } from '../types'
import { exportFileWithDialog, isElectron } from './electronApi'
import { computeContentBounds } from './viewportUtils'

export function exportMarkdownBundle(cards: Card[]): string {
  if (cards.length === 0) return ''
  return cards
    .map((card, index) => {
      const title = card.title.trim() || `卡片 ${index + 1}`
      return `## ${title}\n\n${card.content.trim()}\n`
    })
    .join('\n---\n\n')
}

export async function exportCanvasPng(
  cards: Card[],
  groups: CardGroup[],
  theme: 'light' | 'dark',
): Promise<Blob> {
  const bounds = computeContentBounds(cards, groups)
  const pad = 40
  const width = Math.ceil(bounds.width + pad * 2)
  const height = Math.ceil(bounds.height + pad * 2)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('无法创建画布')

  ctx.fillStyle = theme === 'dark' ? '#1a1a1e' : '#e8e8ec'
  ctx.fillRect(0, 0, width, height)

  const offsetX = pad - bounds.x
  const offsetY = pad - bounds.y

  for (const group of groups) {
    const groupCards = cards.filter((c) => group.cardIds.includes(c.id))
    if (groupCards.length < 2) continue
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const card of groupCards) {
      minX = Math.min(minX, card.position.x)
      minY = Math.min(minY, card.position.y)
      maxX = Math.max(maxX, card.position.x + card.size.width)
      maxY = Math.max(maxY, card.position.y + card.size.height)
    }
    ctx.fillStyle = theme === 'dark' ? 'rgba(63, 63, 70, 0.35)' : 'rgba(161, 161, 170, 0.15)'
    ctx.strokeStyle = theme === 'dark' ? 'rgba(113, 113, 122, 0.65)' : 'rgba(113, 113, 122, 0.45)'
    ctx.lineWidth = 1
    ctx.setLineDash([6, 4])
    const gx = minX + offsetX - 14
    const gy = minY + offsetY - 42
    const gw = maxX - minX + 28
    const gh = maxY - minY + 56
    ctx.fillRect(gx, gy, gw, gh)
    ctx.strokeRect(gx, gy, gw, gh)
    ctx.setLineDash([])
    ctx.fillStyle = theme === 'dark' ? '#d4d4d8' : '#52525b'
    ctx.font = '600 12px system-ui, sans-serif'
    ctx.fillText(group.title || '组合', gx + 8, gy + 18)
  }

  for (const card of cards) {
    const x = card.position.x + offsetX
    const y = card.position.y + offsetY
    const w = card.size.width
    const h = card.size.height

    ctx.fillStyle = theme === 'dark' ? '#32323a' : '#ffffff'
    ctx.strokeStyle = theme === 'dark' ? '#45454f' : '#d4d4d4'
    ctx.lineWidth = 1.5
    roundRect(ctx, x, y, w, h, 10)
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = theme === 'dark' ? '#3f3f46' : '#f0f0f0'
    ctx.fillRect(x, y, w, 32)
    ctx.fillStyle = theme === 'dark' ? '#f4f4f5' : '#333333'
    ctx.font = '600 13px system-ui, sans-serif'
    const title = card.title.trim() || '无标题'
    ctx.fillText(truncate(ctx, title, w - 24), x + 12, y + 20)

    ctx.fillStyle = theme === 'dark' ? '#e4e4e7' : '#2d2d2d'
    ctx.font = '13px system-ui, sans-serif'
    const lines = card.content.split('\n').slice(0, 8)
    let ly = y + 52
    for (const line of lines) {
      ctx.fillText(truncate(ctx, line.replace(/^#+\s*/, ''), w - 24), x + 12, ly)
      ly += 18
      if (ly > y + h - 12) break
    }
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('导出 PNG 失败'))
    }, 'image/png')
  })
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function truncate(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text
  let result = text
  while (result.length > 0 && ctx.measureText(`${result}…`).width > maxWidth) {
    result = result.slice(0, -1)
  }
  return `${result}…`
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export async function saveBlob(blob: Blob, filename: string) {
  if (isElectron()) {
    await exportFileWithDialog(blob, filename)
    return
  }
  downloadBlob(blob, filename)
}

export function exportStaticHtml(cards: Card[], edges: Edge[]): string {
  const cardHtml = cards
    .map((card) => {
      const title = card.title.trim() || '无标题'
      const body = card.content
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br/>')
      return `<article style="margin:24px 0;padding:16px;border:1px solid #ddd;border-radius:8px"><h2>${title}</h2><div>${body}</div></article>`
    })
    .join('\n')
  const edgeHtml = edges
    .map((e) => `<li>${e.sourceCardId} → ${e.targetCardId}</li>`)
    .join('\n')
  return `<!DOCTYPE html><html lang="zh"><head><meta charset="UTF-8"/><title>MDoCards Export</title></head><body style="max-width:720px;margin:40px auto;font-family:system-ui,sans-serif">${cardHtml}<footer><h3>连线</h3><ul>${edgeHtml}</ul></footer></body></html>`
}
