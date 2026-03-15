import type { AiAdapter } from './ai'
import type { Decision, Place, Review, TrustSnapshot } from './types'

const marketingTerms = ['全网最低', '官方推荐', '绝绝子', '冲冲冲', '闭眼入', '保姆级']

const extractKeywordsFromReview = (review: Review): string[] => {
  const fromTags = review.tags
  const normalized = review.text.replace(/[，。！？,.!?]/g, ' ')
  const fromText = normalized
    .split(/\s+/g)
    .map((item) => item.trim())
    .filter((item) => item.length >= 2 && item.length <= 6)
  return [...fromTags, ...fromText]
}

const countKeywords = (reviews: Review[]): Array<{ keyword: string; score: number }> => {
  const map = new Map<string, number>()

  for (const review of reviews) {
    const tokens = extractKeywordsFromReview(review)
    for (const token of tokens) {
      if (marketingTerms.some((term) => token.includes(term))) {
        continue
      }
      const next = (map.get(token) ?? 0) + review.qualityWeight
      map.set(token, next)
    }
  }

  return Array.from(map.entries())
    .map(([keyword, score]) => ({ keyword, score }))
    .sort((a, b) => b.score - a.score)
}

const calcRevisitRate = (decisions: Decision[]): number => {
  if (decisions.length === 0) {
    return 0
  }

  const bySession = new Map<string, number>()
  for (const decision of decisions) {
    bySession.set(decision.sessionToken, (bySession.get(decision.sessionToken) ?? 0) + 1)
  }

  const revisitUsers = Array.from(bySession.values()).filter((count) => count >= 2).length
  const allUsers = bySession.size || 1
  return Math.round((revisitUsers / allUsers) * 100)
}

export const buildTrustSnapshot = async (
  place: Place,
  reviews: Review[],
  decisions30d: Decision[],
  ai: AiAdapter,
): Promise<TrustSnapshot> => {
  const keywordRank = countKeywords(reviews)
  const keywords = keywordRank.slice(0, 3).map((item) => item.keyword)
  const revisitRate30d = calcRevisitRate(decisions30d) || place.trustSignals.revisitRate30d
  const fallbackKeywords = keywords.length > 0 ? keywords : place.trustSignals.keywords
  const aiSummary = await ai.summarizeTrust({
    keywords: fallbackKeywords,
    revisitRate30d,
  })

  return {
    placeId: place.id,
    keywords: fallbackKeywords,
    revisitRate30d,
    aiSummary,
    updatedAt: new Date().toISOString(),
  }
}

