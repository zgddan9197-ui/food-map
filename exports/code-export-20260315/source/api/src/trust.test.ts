import { describe, expect, it } from 'vitest'
import { createAiAdapter } from './ai'
import { places } from './catalog'
import { buildTrustSnapshot } from './trust'
import type { Decision, Review } from './types'

describe('trust snapshot', () => {
  it('combines review keywords and revisit rate', async () => {
    const place = places[0]
    const reviews: Review[] = [
      {
        id: 'r1',
        placeId: place.id,
        sessionToken: 'u1',
        tags: ['汤底鲜', '出餐快'],
        text: '汤底鲜，份量足',
        images: [],
        qualityWeight: 1,
        status: 'approved',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'r2',
        placeId: place.id,
        sessionToken: 'u2',
        tags: ['出餐快'],
        text: '全网最低',
        images: [],
        qualityWeight: 0.3,
        status: 'approved',
        createdAt: new Date().toISOString(),
      },
    ]

    const decisions: Decision[] = [
      { id: 'd1', placeId: place.id, sceneId: 's1', sessionToken: 'u1', createdAt: new Date().toISOString() },
      { id: 'd2', placeId: place.id, sceneId: 's2', sessionToken: 'u1', createdAt: new Date().toISOString() },
      { id: 'd3', placeId: place.id, sceneId: 's3', sessionToken: 'u2', createdAt: new Date().toISOString() },
    ]

    const snapshot = await buildTrustSnapshot(place, reviews, decisions, createAiAdapter())

    expect(snapshot.keywords.length).toBeGreaterThan(0)
    expect(snapshot.revisitRate30d).toBeGreaterThan(0)
    expect(snapshot.aiSummary).toContain('回头率')
  })
})

