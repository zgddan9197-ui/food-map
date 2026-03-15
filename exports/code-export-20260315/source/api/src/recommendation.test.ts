import { describe, expect, it } from 'vitest'
import { campuses, places } from './catalog'
import { buildRankedRecommendations, selectNextBatch } from './recommendation'

describe('api recommendation batch policy', () => {
  it('keeps at least 40% new places after refresh when pool is enough', () => {
    const campus = campuses[0]
    const scene = {
      campusId: campus.id,
      people: 'smallGroup' as const,
      mealTime: 'dinner' as const,
      urgency: 'normal' as const,
      freeText: '想吃辣的，不要太贵',
    }

    const scoped = places.filter((item) => item.campusId === campus.id)
    const ranked = buildRankedRecommendations(scoped, scene, campus, {}, [])

    const firstBatch = selectNextBatch(ranked, new Set(), new Set(), 5)
    const seen = new Set(firstBatch.map((item) => item.place.id))
    const secondBatch = selectNextBatch(ranked, new Set(firstBatch.map((item) => item.place.id)), seen, 5)

    const newCount = secondBatch.filter((item) => !seen.has(item.place.id)).length
    expect(newCount).toBeGreaterThanOrEqual(2)
  })
})

