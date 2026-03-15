"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPgMirror = void 0;
const promises_1 = require("node:fs/promises");
const node_path_1 = __importDefault(require("node:path"));
const pg_1 = require("pg");
class NoopMirror {
    enabled = false;
    async init() { }
    async saveSession(session) {
        void session;
    }
    async saveSceneSession(scene) {
        void scene;
    }
    async saveRecommendations(rows) {
        void rows;
    }
    async saveUserEvent(event) {
        void event;
    }
    async saveDecision(decision) {
        void decision;
    }
    async saveReview(review) {
        void review;
    }
    async saveCommunityPost(post) {
        void post;
    }
    async saveCommunityComment(comment) {
        void comment;
    }
    async saveSubmission(input) {
        void input;
    }
    async saveNotification(item) {
        void item;
    }
    async saveModeration(item) {
        void item;
    }
    async updateModeration(item) {
        void item;
    }
    async saveTrustSnapshot(snapshot) {
        void snapshot;
    }
}
class PgMirror {
    enabled = true;
    pool;
    constructor(databaseUrl) {
        this.pool = new pg_1.Pool({
            connectionString: databaseUrl,
        });
    }
    async init() {
        const schemaPath = node_path_1.default.resolve(__dirname, '../sql/schema.sql');
        const ddl = await (0, promises_1.readFile)(schemaPath, 'utf8');
        await this.pool.query(ddl);
    }
    async safeWrite(query, params) {
        try {
            await this.pool.query(query, params);
        }
        catch {
            // keep API write path non-blocking when db unavailable
        }
    }
    async saveSession(session) {
        await this.safeWrite(`INSERT INTO anonymous_sessions (token, device_id, created_at, last_seen_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (token) DO UPDATE SET last_seen_at = EXCLUDED.last_seen_at`, [session.token, session.deviceId, session.createdAt, session.lastSeenAt]);
    }
    async saveSceneSession(scene) {
        await this.safeWrite(`INSERT INTO scene_sessions (id, session_token, scene_payload, created_at)
       VALUES ($1, $2, $3::jsonb, $4)
       ON CONFLICT (id) DO NOTHING`, [scene.id, scene.sessionToken, JSON.stringify(scene.scene), scene.createdAt]);
    }
    async saveRecommendations(rows) {
        for (const row of rows) {
            await this.safeWrite(`INSERT INTO recommendation_results (scene_id, place_id, score, reason, walk_minutes)
         VALUES ($1, $2, $3, $4, $5)`, [row.sceneId, row.placeId, row.score, row.reason, row.walkMinutes]);
        }
    }
    async saveUserEvent(event) {
        await this.safeWrite(`INSERT INTO user_events (id, session_token, event_name, payload, created_at)
       VALUES ($1, $2, $3, $4::jsonb, $5)`, [event.id, event.sessionToken, event.name, JSON.stringify(event.payload), event.createdAt]);
    }
    async saveDecision(decision) {
        await this.safeWrite(`INSERT INTO decisions (id, scene_id, place_id, session_token, created_at)
       VALUES ($1, $2, $3, $4, $5)`, [decision.id, decision.sceneId, decision.placeId, decision.sessionToken, decision.createdAt]);
    }
    async saveReview(review) {
        await this.safeWrite(`INSERT INTO reviews (id, place_id, session_token, tags, body, images, quality_weight, status, created_at)
       VALUES ($1, $2, $3, $4::jsonb, $5, $6::jsonb, $7, $8, $9)`, [
            review.id,
            review.placeId,
            review.sessionToken,
            JSON.stringify(review.tags),
            review.text,
            JSON.stringify(review.images),
            review.qualityWeight,
            review.status,
            review.createdAt,
        ]);
    }
    async saveCommunityPost(post) {
        await this.safeWrite(`INSERT INTO community_posts (id, session_token, author, title, body, place_id, tags, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9)`, [
            post.id,
            post.sessionToken,
            post.author,
            post.title,
            post.body,
            post.placeId,
            JSON.stringify(post.tags),
            post.status,
            post.createdAt,
        ]);
    }
    async saveCommunityComment(comment) {
        await this.safeWrite(`INSERT INTO community_comments (id, post_id, session_token, content, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`, [comment.id, comment.postId, comment.sessionToken, comment.content, comment.status, comment.createdAt]);
    }
    async saveSubmission(input) {
        await this.safeWrite(`INSERT INTO place_submissions (id, session_token, name, type, campus_id, address_hint, note, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`, [
            input.id,
            input.sessionToken,
            input.name,
            input.type,
            input.campusId,
            input.addressHint,
            input.note,
            input.status,
            input.createdAt,
        ]);
    }
    async saveNotification(item) {
        await this.safeWrite(`INSERT INTO in_app_notifications (id, session_token, title, body, due_at, acknowledged, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`, [item.id, item.sessionToken, item.title, item.body, item.dueAt, item.acknowledged, item.createdAt]);
    }
    async saveModeration(item) {
        await this.safeWrite(`INSERT INTO moderation_queue (id, target_type, target_id, reason, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`, [
            item.id,
            item.targetType,
            item.targetId,
            item.reason,
            item.status,
            item.createdAt,
            item.updatedAt,
        ]);
    }
    async updateModeration(item) {
        await this.safeWrite(`UPDATE moderation_queue
       SET status = $2, updated_at = $3
       WHERE id = $1`, [item.id, item.status, item.updatedAt]);
    }
    async saveTrustSnapshot(snapshot) {
        await this.safeWrite(`INSERT INTO trust_snapshots (place_id, keywords, revisit_rate_30d, ai_summary, updated_at)
       VALUES ($1, $2::jsonb, $3, $4, $5)
       ON CONFLICT (place_id)
       DO UPDATE SET keywords = EXCLUDED.keywords, revisit_rate_30d = EXCLUDED.revisit_rate_30d, ai_summary = EXCLUDED.ai_summary, updated_at = EXCLUDED.updated_at`, [
            snapshot.placeId,
            JSON.stringify(snapshot.keywords),
            snapshot.revisitRate30d,
            snapshot.aiSummary,
            snapshot.updatedAt,
        ]);
    }
}
const createPgMirror = (databaseUrl) => {
    if (!databaseUrl) {
        return new NoopMirror();
    }
    return new PgMirror(databaseUrl);
};
exports.createPgMirror = createPgMirror;
