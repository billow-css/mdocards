import { describe, expect, it } from 'vitest'
import { popPast, pushPast } from './history'

describe('history', () => {
  it('pushes and pops snapshots', () => {
    const past = pushPast([], { cards: [], edges: [], groups: [] })
    const popped = popPast(past)
    expect(popped?.rest).toHaveLength(0)
    expect(popped?.snapshot.cards).toEqual([])
  })
})
