export type PlaceType = 'restaurant' | 'stall'
export type PeopleCount = 'solo' | 'smallGroup' | 'group'
export type MealTime = 'breakfast' | 'lunch' | 'dinner' | 'lateNight'
export type Urgency = 'rush' | 'normal' | 'relax'

export interface Campus {
  id: string
  name: string
  shortName: string
  center: {
    lng: number
    lat: number
  }
  radiusKm: number
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

export interface Place {
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
  campusId: string
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

export interface PlaceWithRecommendation {
  place: Place
  recommendation: RecommendationItem
  distanceKm: number
  openNow: boolean
}

export interface Session {
  token: string
  deviceId: string
  createdAt: string
  lastSeenAt: string
}

export interface SceneSession {
  id: string
  sessionToken: string
  scene: SceneInput
  createdAt: string
}

export interface UserEvent {
  id: string
  name:
    | 'scene_submit'
    | 'batch_refresh'
    | 'detail_view'
    | 'detail_dwell'
    | 'go_this_place'
    | 'card_open_detail'
    | 'review_submit'
    | 'community_post'
  createdAt: string
  sessionToken: string
  payload: Record<string, unknown>
}

export interface Decision {
  id: string
  sceneId: string
  placeId: string
  sessionToken: string
  createdAt: string
}

export interface Review {
  id: string
  placeId: string
  sessionToken: string
  tags: string[]
  text: string
  images: string[]
  qualityWeight: number
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
}

export interface CommunityComment {
  id: string
  postId: string
  sessionToken: string
  content: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
}

export interface CommunityPost {
  id: string
  sessionToken: string | null
  author: string
  title: string
  body: string
  placeId: string | null
  tags: string[]
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
}

export interface PlaceSubmission {
  id: string
  sessionToken: string
  name: string
  type: PlaceType
  campusId: string
  addressHint: string
  note: string
  createdAt: string
  status: 'pending' | 'approved' | 'rejected'
}

export interface InAppNotification {
  id: string
  sessionToken: string
  title: string
  body: string
  dueAt: string
  acknowledged: boolean
  createdAt: string
}

export interface ModerationItem {
  id: string
  targetType: 'review' | 'community_post' | 'community_comment' | 'place_submission'
  targetId: string
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
  updatedAt: string
}

export interface TrustSnapshot {
  placeId: string
  keywords: string[]
  revisitRate30d: number
  aiSummary: string
  updatedAt: string
}
