export type PlaceType = 'restaurant' | 'stall'

export type PeopleCount = 'solo' | 'smallGroup' | 'group'
export type MealTime = 'breakfast' | 'lunch' | 'dinner' | 'lateNight'
export type Urgency = 'rush' | 'normal' | 'relax'

export interface Campus {
  id: string
  name: string
  center: {
    lng: number
    lat: number
  }
  radiusKm: number
  shortName: string
}

export interface OpenHourSlot {
  day: 0 | 1 | 2 | 3 | 4 | 5 | 6
  start: string
  end: string
}

export interface TrustSignals {
  keywords: string[]
  revisitRate30d: number
  aiSummary: string
}

export interface Restaurant {
  id: string
  name: string
  campusId: string
  type: PlaceType
  location: {
    lng: number
    lat: number
  }
  cuisines: string[]
  priceLevel: 1 | 2 | 3 | 4
  avgPrice: number
  rating: number
  reviewCount: number
  openHours: OpenHourSlot[]
  tags: string[]
  signatureDishes: string[]
  address: string
  vibeLine: string
  trustSignals: TrustSignals
  mealServiceSpeed: 'fast' | 'normal' | 'slow'
}

export interface SceneInput {
  people: PeopleCount
  mealTime: MealTime
  urgency: Urgency
  freeText: string
}

export interface RecommendationItem {
  id: string
  score: number
  reason: string
  walkMinutes: number
}

export interface RestaurantWithRecommendation {
  restaurant: Restaurant
  recommendation: RecommendationItem
  distanceKm: number
  openNow: boolean
}

export type ViewMode = 'map' | 'feed'

export interface CommunityPost {
  id: string
  author: string
  title: string
  body: string
  restaurantId: string
  tags: string[]
  createdAt: string
}
