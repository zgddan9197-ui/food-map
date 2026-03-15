import { randomUUID } from 'node:crypto'
import { initialCommunityPosts } from './catalog'
import type {
  CommunityComment,
  CommunityPost,
  Decision,
  InAppNotification,
  ModerationItem,
  PlaceSubmission,
  Review,
  SceneInput,
  SceneSession,
  Session,
  TrustSnapshot,
  UserEvent,
} from './types'

export interface CreateReviewInput {
  placeId: string
  sessionToken: string
  tags: string[]
  text: string
  images: string[]
  qualityWeight: number
}

export interface CreatePostInput {
  sessionToken: string
  author: string
  title: string
  body: string
  placeId: string | null
  tags: string[]
}

export interface CreateCommentInput {
  sessionToken: string
  postId: string
  content: string
}

export interface CreateSubmissionInput {
  sessionToken: string
  name: string
  type: 'restaurant' | 'stall'
  campusId: string
  addressHint: string
  note: string
}

export class MemoryStore {
  private sessions = new Map<string, Session>()
  private scenes = new Map<string, SceneSession>()
  private sceneSeen = new Map<string, Set<string>>()
  private events: UserEvent[] = []
  private decisions: Decision[] = []
  private reviews: Review[] = []
  private posts: CommunityPost[] = []
  private comments: CommunityComment[] = []
  private submissions: PlaceSubmission[] = []
  private notifications: InAppNotification[] = []
  private moderation: ModerationItem[] = []
  private trustSnapshots = new Map<string, TrustSnapshot>()

  constructor() {
    this.posts = initialCommunityPosts.map((item) => ({
      id: item.id,
      sessionToken: null,
      author: item.author,
      title: item.title,
      body: item.body,
      placeId: item.placeId,
      tags: item.tags,
      status: 'approved',
      createdAt: item.createdAt,
    }))
  }

  createSession(deviceId: string): Session {
    const now = new Date().toISOString()
    const token = `anon_${randomUUID()}`
    const session: Session = {
      token,
      deviceId,
      createdAt: now,
      lastSeenAt: now,
    }
    this.sessions.set(token, session)
    return session
  }

  getSession(token: string): Session | null {
    const session = this.sessions.get(token)
    if (!session) {
      return null
    }
    session.lastSeenAt = new Date().toISOString()
    this.sessions.set(token, session)
    return session
  }

  createSceneSession(sessionToken: string, scene: SceneInput): SceneSession {
    const sceneSession: SceneSession = {
      id: `scene_${randomUUID()}`,
      sessionToken,
      scene,
      createdAt: new Date().toISOString(),
    }
    this.scenes.set(sceneSession.id, sceneSession)
    this.sceneSeen.set(sceneSession.id, new Set())
    return sceneSession
  }

  getSceneSession(sceneId: string): SceneSession | null {
    return this.scenes.get(sceneId) ?? null
  }

  getSceneSeenIds(sceneId: string): Set<string> {
    return this.sceneSeen.get(sceneId) ?? new Set()
  }

  setSceneSeenIds(sceneId: string, ids: Set<string>): void {
    this.sceneSeen.set(sceneId, new Set(Array.from(ids)))
  }

  pushEvent(event: Omit<UserEvent, 'id' | 'createdAt'>): UserEvent {
    const item: UserEvent = {
      id: `evt_${randomUUID()}`,
      createdAt: new Date().toISOString(),
      ...event,
    }
    this.events.push(item)
    return item
  }

  createDecision(sceneId: string, placeId: string, sessionToken: string): Decision {
    const item: Decision = {
      id: `go_${randomUUID()}`,
      sceneId,
      placeId,
      sessionToken,
      createdAt: new Date().toISOString(),
    }
    this.decisions.push(item)
    return item
  }

  getRecentDecisionsForPlace(placeId: string, days: number): Decision[] {
    const threshold = Date.now() - days * 24 * 60 * 60 * 1000
    return this.decisions.filter((item) => {
      if (item.placeId !== placeId) {
        return false
      }
      return new Date(item.createdAt).getTime() >= threshold
    })
  }

  createReview(input: CreateReviewInput): Review {
    const item: Review = {
      id: `rev_${randomUUID()}`,
      placeId: input.placeId,
      sessionToken: input.sessionToken,
      tags: input.tags,
      text: input.text,
      images: input.images,
      qualityWeight: input.qualityWeight,
      status: 'pending',
      createdAt: new Date().toISOString(),
    }
    this.reviews.push(item)
    return item
  }

  getReviewsByPlace(placeId: string): Review[] {
    return this.reviews.filter((item) => item.placeId === placeId && item.status === 'approved')
  }

  createPost(input: CreatePostInput): CommunityPost {
    const post: CommunityPost = {
      id: `cp_${randomUUID()}`,
      sessionToken: input.sessionToken,
      author: input.author,
      title: input.title,
      body: input.body,
      placeId: input.placeId,
      tags: input.tags,
      status: 'pending',
      createdAt: new Date().toISOString(),
    }
    this.posts.push(post)
    return post
  }

  listApprovedPosts(): CommunityPost[] {
    return this.posts
      .filter((item) => item.status === 'approved')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }

  getPost(postId: string): CommunityPost | null {
    return this.posts.find((item) => item.id === postId) ?? null
  }

  createComment(input: CreateCommentInput): CommunityComment {
    const comment: CommunityComment = {
      id: `cc_${randomUUID()}`,
      postId: input.postId,
      sessionToken: input.sessionToken,
      content: input.content,
      status: 'pending',
      createdAt: new Date().toISOString(),
    }
    this.comments.push(comment)
    return comment
  }

  listApprovedCommentsByPost(postId: string): CommunityComment[] {
    return this.comments
      .filter((item) => item.postId === postId && item.status === 'approved')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  }

  createSubmission(input: CreateSubmissionInput): PlaceSubmission {
    const item: PlaceSubmission = {
      id: `sub_${randomUUID()}`,
      sessionToken: input.sessionToken,
      name: input.name,
      type: input.type,
      campusId: input.campusId,
      addressHint: input.addressHint,
      note: input.note,
      createdAt: new Date().toISOString(),
      status: 'pending',
    }
    this.submissions.push(item)
    return item
  }

  createNotification(
    sessionToken: string,
    title: string,
    body: string,
    dueAt: string,
  ): InAppNotification {
    const item: InAppNotification = {
      id: `note_${randomUUID()}`,
      sessionToken,
      title,
      body,
      dueAt,
      acknowledged: false,
      createdAt: new Date().toISOString(),
    }
    this.notifications.push(item)
    return item
  }

  listDueNotifications(sessionToken: string): InAppNotification[] {
    const now = Date.now()
    return this.notifications
      .filter((item) => {
        if (item.sessionToken !== sessionToken) {
          return false
        }
        if (item.acknowledged) {
          return false
        }
        return new Date(item.dueAt).getTime() <= now
      })
      .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
  }

  acknowledgeNotification(id: string, sessionToken: string): boolean {
    const index = this.notifications.findIndex(
      (item) => item.id === id && item.sessionToken === sessionToken,
    )
    if (index < 0) {
      return false
    }
    this.notifications[index] = { ...this.notifications[index], acknowledged: true }
    return true
  }

  createModerationItem(
    targetType: ModerationItem['targetType'],
    targetId: string,
    reason: string,
  ): ModerationItem {
    const now = new Date().toISOString()
    const item: ModerationItem = {
      id: `mod_${randomUUID()}`,
      targetType,
      targetId,
      reason,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    }
    this.moderation.push(item)
    return item
  }

  listPendingModeration(): ModerationItem[] {
    return this.moderation
      .filter((item) => item.status === 'pending')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  }

  moderate(itemId: string, action: 'approve' | 'reject'): ModerationItem | null {
    const index = this.moderation.findIndex((item) => item.id === itemId)
    if (index < 0) {
      return null
    }
    const current = this.moderation[index]
    const nextStatus = action === 'approve' ? 'approved' : 'rejected'
    const next: ModerationItem = {
      ...current,
      status: nextStatus,
      updatedAt: new Date().toISOString(),
    }
    this.moderation[index] = next
    this.applyTargetStatus(next.targetType, next.targetId, nextStatus)
    return next
  }

  private applyTargetStatus(
    targetType: ModerationItem['targetType'],
    targetId: string,
    status: 'approved' | 'rejected',
  ): void {
    if (targetType === 'review') {
      const index = this.reviews.findIndex((item) => item.id === targetId)
      if (index >= 0) {
        this.reviews[index] = { ...this.reviews[index], status }
      }
    }
    if (targetType === 'community_post') {
      const index = this.posts.findIndex((item) => item.id === targetId)
      if (index >= 0) {
        this.posts[index] = { ...this.posts[index], status }
      }
    }
    if (targetType === 'community_comment') {
      const index = this.comments.findIndex((item) => item.id === targetId)
      if (index >= 0) {
        this.comments[index] = { ...this.comments[index], status }
      }
    }
    if (targetType === 'place_submission') {
      const index = this.submissions.findIndex((item) => item.id === targetId)
      if (index >= 0) {
        this.submissions[index] = { ...this.submissions[index], status }
      }
    }
  }

  getCachedTrustSnapshot(placeId: string): TrustSnapshot | null {
    return this.trustSnapshots.get(placeId) ?? null
  }

  setTrustSnapshot(snapshot: TrustSnapshot): void {
    this.trustSnapshots.set(snapshot.placeId, snapshot)
  }
}
