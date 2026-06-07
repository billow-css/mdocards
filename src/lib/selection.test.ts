import { describe, expect, it } from 'vitest'
import { searchCards, toggleCardInSelection } from './selection'
import type { Card } from '../types'

const cards: Card[] = [
  {
    id: '1',
    title: 'Hello',
    titleHue: 0,
    position: { x: 0, y: 0 },
    size: { width: 100, height: 100 },
    content: 'world',
    anchorOverrides: {},
  },
]

describe('selection helpers', () => {
  it('toggles ids', () => {
    expect(toggleCardInSelection(['1'], '2')).toEqual(['1', '2'])
    expect(toggleCardInSelection(['1', '2'], '1')).toEqual(['2'])
  })

  it('searches title and content', () => {
    expect(searchCards(cards, 'hello')).toHaveLength(1)
    expect(searchCards(cards, 'world')).toHaveLength(1)
    expect(searchCards(cards, 'missing')).toHaveLength(0)
  })
})
