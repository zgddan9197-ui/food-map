import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { Pool } from 'pg'
import type {
  CommunityComment,
  CommunityPost,
  Decision,
  InAppNotification,
  ModerationItem,
  Review,
  SceneSession,
  Session,
  TrustSnapshot,
  UserEvent,
} from './types'

interface SaveRecommendationInput {
  sceneId: string
  placeId: string
  score: number
  reason: string
  walkMinutes: number
}

export interface MirrorWriter {
  enabled: boolean
  init(): Promise<void>
  saveSession(session: Session): Promise<void>
  saveSceneSession(scene: SceneSession): Promise<void>
  saveRecommendations(rows: SaveRecommendationInput[]): Promise<void>
  saveUserEvent(event: UserEvent): Promise<void>
  saveDecision(decision: Decision): Promise<void>
  saveReview(review: Review): Promise<void>
  saveCommunityPost(post: CommunityPost): Promise<void>
  saveCommunityComment(comment: CommunityComment): Promise<void>
  saveSubmission(input: {
    id: string
    sessionToken: string
    name: string
    type: 'restaurant' | 'stall'
    campusId: string
    addressHint: string
    note: string
    status: 'pending' | 'approved' | 'rejected'
    createdAt: string
  }): Promise<void>
  saveNotification(item: InAppNotification): Promise<void>
  saveModeration(item: ModerationItem): Promise<void>
  updateModeration(item: ModerationItem): Promise<void>
  saveTrustSnapshot(snapshot: TrustSnapshot): Promise<void>
}

class NoopMirror {
  readonly enabled = false

  async init(): Promise<void> {}
  async saveSession(session: Session): Promise<void> {
    void session
  }
  async saveSceneSession(scene: SceneSession): Promise<void> {
    void scene
  }
  async saveRecommendations(rows: SaveRecommendationInput[]): Promise<void> {
    void rows
  }
  async saveUserEvent(event: UserEvent): Promise<void> {
    void event
  }
  async saveDecision(decision: Decision): Promise<void> {
    void decision
  }
  async saveReview(review: Review): Promise<void> {
    void review
  }
  async saveCommunityPost(post: CommunityPost): Promise<void> {
    void post
  }
  async saveCommunityComment(comment: CommunityComment): Promise<void> {
    void comment
  }
  async saveSubmission(input: {
    id: string
    sessionToken: string
    name: string
    type: 'restaurant' | 'stall'
    campusId: string
    addressHint: string
    note: string
    status: 'pending' | 'approved' | 'rejected'
    createdAt: string
  }): Promise<void> {
    void input
  }
  async saveNotification(item: InAppNotification): Promise<void> {
    void item
  }
  async saveModeration(item: ModerationItem): Promise<void> {
    void item
  }
  async updateModeration(item: ModerationItem): Promise<void> {
    void item
  }
  async saveTrustSnapshot(snapshot: TrustSnapshot): Promise<void> {
    void snapshot
  }
}

class PgMirror {
  readonly enabled = true
  private pool: Pool

  constructor(databaseUrl: string) {
    this.pool = new Pool({
      connectionString: databaseUrl,
    })
  }

  async init(): Promise<void> {
    const schemaPath = path.resolve(__dirname, '../sql/schema.sql')
    const ddl = await readFile(schemaPath, 'utf8')
    await this.pool.query(ddl)
  }

  private async safeWrite(query: string, params: unknown[]): Promise<void> {
    try {
      await this.pool.query(query, params)
    } catch {
      // keep API write path non-blocking when db unavailable
    }
  }

  async saveSession(session: Session): Promise<void> {
    await this.safeWrite(
      `INSERT INTO anonymous_sessions (token, device_id, created_at, last_seen_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (token) DO UPDATE SET last_seen_at = EXCLUDED.last_seen_at`,
      [session.token, session.deviceId, session.createdAt, session.lastSeenAt],
    )
  }

  async saveSceneSession(scene: SceneSession): Promise<void> {
    await this.safeWrite(
      `INSERT INTO scene_sessions (id, session_token, scene_payload, created_at)
       VALUES ($1, $2, $3::jsonb, $4)
       ON CONFLICT (id) DO NOTHING`,
      [scene.id, scene.sessionToken, JSON.stringify(scene.scene), scene.createdAt],
    )
  }

  async saveRecommendations(rows: SaveRecommendationInput[]): Promise<void> {
    for (const row of rows) {
      await this.safeWrite(
        `INSERT INTO recommendation_results (scene_id, place_id, score, reason, walk_minutes)
         VALUES ($1, $2, $3, $4, $5)`,
        [row.sceneId, row.placeId, row.score, row.reason, row.walkMinutes],
      )
    }
  }

  async saveUserEvent(event: UserEvent): Promise<void> {
    await this.safeWrite(
      `INSERT INTO user_events (id, session_token, event_name, payload, created_at)
       VALUES ($1, $2, $3, $4::jsonb, $5)`,
      [event.id, event.sessionToken, event.name, JSON.stringify(event.payload), event.createdAt],
    )
  }

  async saveDecision(decision: Decision): Promise<void> {
    await this.safeWrite(
      `INSERT INTO decisions (id, scene_id, place_id, session_token, created_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [decision.id, decision.sceneId, decision.placeId, decision.sessionToken, decision.createdAt],
    )
  }

  async saveReview(review: Review): Promise<void> {
    await this.safeWrite(
      `INSERT INTO reviews (id, place_id, session_token, tags, body, images, quality_weight, status, created_at)
       VALUES ($1, $2, $3, $4::jsonb, $5, $6::jsonb, $7, $8, $9)`,
      [
        review.id,
        review.placeId,
        review.sessionToken,
        JSON.stringify(review.tags),
        review.text,
        JSON.stringify(review.images),
        review.qualityWeight,
        review.status,
        review.createdAt,
      ],
    )
  }

  async saveCommunityPost(post: CommunityPost): Promise<void> {
    await this.safeWrite(
      `INSERT INTO community_posts (id, session_token, author, title, body, place_id, tags, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9)`,
      [
        post.id,
        post.sessionToken,
        post.author,
        post.title,
        post.body,
        post.placeId,
        JSON.stringify(post.tags),
        post.status,
        post.createdAt,
      ],
    )
  }

  async saveCommunityComment(comment: CommunityComment): Promise<void> {
    await this.safeWrite(
      `INSERT INTO community_comments (id, post_id, session_token, content, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [comment.id, comment.postId, comment.sessionToken, comment.content, comment.status, comment.createdAt],
    )
  }

  async saveSubmission(input: {
    id: string
    sessionToken: string
    name: string
    type: 'restaurant' | 'stall'
    campusId: string
    addressHint: string
    note: string
    status: 'pending' | 'approved' | 'rejected'
    createdAt: string
  }): Promise<void> {
    await this.safeWrite(
      `INSERT INTO place_submissions (id, session_token, name, type, campus_id, address_hint, note, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        input.id,
        input.sessionToken,
        input.name,
        input.type,
        input.campusId,
        input.addressHint,
        input.note,
        input.status,
        input.createdAt,
      ],
    )
  }

  async saveNotification(item: InAppNotification): Promise<void> {
    await this.safeWrite(
      `INSERT INTO in_app_notifications (id, session_token, title, body, due_at, acknowledged, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [item.id, item.sessionToken, item.title, item.body, item.dueAt, item.acknowledged, item.createdAt],
    )
  }

  async saveModeration(item: ModerationItem): Promise<void> {
    await this.safeWrite(
      `INSERT INTO moderation_queue (id, target_type, target_id, reason, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        item.id,
        item.targetType,
        item.targetId,
        item.reason,
        item.status,
        item.createdAt,
        item.updatedAt,
      ],
    )
  }

  async updateModeration(item: ModerationItem): Promise<void> {
    await this.safeWrite(
      `UPDATE moderation_queue
       SET status = $2, updated_at = $3
       WHERE id = $1`,
      [item.id, item.status, item.updatedAt],
    )
  }

  async saveTrustSnapshot(snapshot: TrustSnapshot): Promise<void> {
    await this.safeWrite(
      `INSERT INTO trust_snapshots (place_id, keywords, revisit_rate_30d, ai_summary, updated_at)
       VALUES ($1, $2::jsonb, $3, $4, $5)
       ON CONFLICT (place_id)
       DO UPDATE SET keywords = EXCLUDED.keywords, revisit_rate_30d = EXCLUDED.revisit_rate_30d, ai_summary = EXCLUDED.ai_summary, updated_at = EXCLUDED.updated_at`,
      [
        snapshot.placeId,
        JSON.stringify(snapshot.keywords),
        snapshot.revisitRate30d,
        snapshot.aiSummary,
        snapshot.updatedAt,
      ],
    )
  }
}

export const createPgMirror = (databaseUrl: string | undefined): MirrorWriter => {
  if (!databaseUrl) {
    return new NoopMirror()
  }
  return new PgMirror(databaseUrl)
}
