import { describe, expect, it } from 'vitest'
import { alignCards } from './align'
import type { Card } from '../types'

const cards: Card[] = [
  {
    id: 'a',
    title: 'A',
    titleHue: 0,
    position: { x: 0, y: 0 },
    size: { width: 100, height: 100 },
    content: '',
    anchorOverrides: {},
  },
  {
    id: 'b',
    title: 'B',
    titleHue: 0,
    position: { x: 200, y: 40 },
    size: { width: 100, height: 100 },
    content: '',
    anchorOverrides: {},
  },
]

describe('alignCards', () => {
  it('aligns left edges', () => {
    const next = alignCards(cards, ['a', 'b'], 'left')
    expect(next.find((c) => c.id === 'a')?.position.x).toBe(0)
    expect(next.find((c) => c.id === 'b')?.position.x).toBe(0)
  })

  it('aligns top edges', () => {
    const next = alignCards(cards, ['a', 'b'], 'top')
    expect(next.find((c) => c.id === 'b')?.position.y).toBe(0)
  })
})
