"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryStore = void 0;
const node_crypto_1 = require("node:crypto");
const catalog_1 = require("./catalog");
class MemoryStore {
    sessions = new Map();
    scenes = new Map();
    sceneSeen = new Map();
    events = [];
    decisions = [];
    reviews = [];
    posts = [];
    comments = [];
    submissions = [];
    notifications = [];
    moderation = [];
    trustSnapshots = new Map();
    constructor() {
        this.posts = catalog_1.initialCommunityPosts.map((item) => ({
            id: item.id,
            sessionToken: null,
            author: item.author,
            title: item.title,
            body: item.body,
            placeId: item.placeId,
            tags: item.tags,
            status: 'approved',
            createdAt: item.createdAt,
        }));
    }
    createSession(deviceId) {
        const now = new Date().toISOString();
        const token = `anon_${(0, node_crypto_1.randomUUID)()}`;
        const session = {
            token,
            deviceId,
            createdAt: now,
            lastSeenAt: now,
        };
        this.sessions.set(token, session);
        return session;
    }
    getSession(token) {
        const session = this.sessions.get(token);
        if (!session) {
            return null;
        }
        session.lastSeenAt = new Date().toISOString();
        this.sessions.set(token, session);
        return session;
    }
    createSceneSession(sessionToken, scene) {
        const sceneSession = {
            id: `scene_${(0, node_crypto_1.randomUUID)()}`,
            sessionToken,
            scene,
            createdAt: new Date().toISOString(),
        };
        this.scenes.set(sceneSession.id, sceneSession);
        this.sceneSeen.set(sceneSession.id, new Set());
        return sceneSession;
    }
    getSceneSession(sceneId) {
        return this.scenes.get(sceneId) ?? null;
    }
    getSceneSeenIds(sceneId) {
        return this.sceneSeen.get(sceneId) ?? new Set();
    }
    setSceneSeenIds(sceneId, ids) {
        this.sceneSeen.set(sceneId, new Set(Array.from(ids)));
    }
    pushEvent(event) {
        const item = {
            id: `evt_${(0, node_crypto_1.randomUUID)()}`,
            createdAt: new Date().toISOString(),
            ...event,
        };
        this.events.push(item);
        return item;
    }
    createDecision(sceneId, placeId, sessionToken) {
        const item = {
            id: `go_${(0, node_crypto_1.randomUUID)()}`,
            sceneId,
            placeId,
            sessionToken,
            createdAt: new Date().toISOString(),
        };
        this.decisions.push(item);
        return item;
    }
    getRecentDecisionsForPlace(placeId, days) {
        const threshold = Date.now() - days * 24 * 60 * 60 * 1000;
        return this.decisions.filter((item) => {
            if (item.placeId !== placeId) {
                return false;
            }
            return new Date(item.createdAt).getTime() >= threshold;
        });
    }
    createReview(input) {
        const item = {
            id: `rev_${(0, node_crypto_1.randomUUID)()}`,
            placeId: input.placeId,
            sessionToken: input.sessionToken,
            tags: input.tags,
            text: input.text,
            images: input.images,
            qualityWeight: input.qualityWeight,
            status: 'pending',
            createdAt: new Date().toISOString(),
        };
        this.reviews.push(item);
        return item;
    }
    getReviewsByPlace(placeId) {
        return this.reviews.filter((item) => item.placeId === placeId && item.status === 'approved');
    }
    createPost(input) {
        const post = {
            id: `cp_${(0, node_crypto_1.randomUUID)()}`,
            sessionToken: input.sessionToken,
            author: input.author,
            title: input.title,
            body: input.body,
            placeId: input.placeId,
            tags: input.tags,
            status: 'pending',
            createdAt: new Date().toISOString(),
        };
        this.posts.push(post);
        return post;
    }
    listApprovedPosts() {
        return this.posts
            .filter((item) => item.status === 'approved')
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    getPost(postId) {
        return this.posts.find((item) => item.id === postId) ?? null;
    }
    createComment(input) {
        const comment = {
            id: `cc_${(0, node_crypto_1.randomUUID)()}`,
            postId: input.postId,
            sessionToken: input.sessionToken,
            content: input.content,
            status: 'pending',
            createdAt: new Date().toISOString(),
        };
        this.comments.push(comment);
        return comment;
    }
    listApprovedCommentsByPost(postId) {
        return this.comments
            .filter((item) => item.postId === postId && item.status === 'approved')
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }
    createSubmission(input) {
        const item = {
            id: `sub_${(0, node_crypto_1.randomUUID)()}`,
            sessionToken: input.sessionToken,
            name: input.name,
            type: input.type,
            campusId: input.campusId,
            addressHint: input.addressHint,
            note: input.note,
            createdAt: new Date().toISOString(),
            status: 'pending',
        };
        this.submissions.push(item);
        return item;
    }
    createNotification(sessionToken, title, body, dueAt) {
        const item = {
            id: `note_${(0, node_crypto_1.randomUUID)()}`,
            sessionToken,
            title,
            body,
            dueAt,
            acknowledged: false,
            createdAt: new Date().toISOString(),
        };
        this.notifications.push(item);
        return item;
    }
    listDueNotifications(sessionToken) {
        const now = Date.now();
        return this.notifications
            .filter((item) => {
            if (item.sessionToken !== sessionToken) {
                return false;
            }
            if (item.acknowledged) {
                return false;
            }
            return new Date(item.dueAt).getTime() <= now;
        })
            .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
    }
    acknowledgeNotification(id, sessionToken) {
        const index = this.notifications.findIndex((item) => item.id === id && item.sessionToken === sessionToken);
        if (index < 0) {
            return false;
        }
        this.notifications[index] = { ...this.notifications[index], acknowledged: true };
        return true;
    }
    createModerationItem(targetType, targetId, reason) {
        const now = new Date().toISOString();
        const item = {
            id: `mod_${(0, node_crypto_1.randomUUID)()}`,
            targetType,
            targetId,
            reason,
            status: 'pending',
            createdAt: now,
            updatedAt: now,
        };
        this.moderation.push(item);
        return item;
    }
    listPendingModeration() {
        return this.moderation
            .filter((item) => item.status === 'pending')
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }
    moderate(itemId, action) {
        const index = this.moderation.findIndex((item) => item.id === itemId);
        if (index < 0) {
            return null;
        }
        const current = this.moderation[index];
        const nextStatus = action === 'approve' ? 'approved' : 'rejected';
        const next = {
            ...current,
            status: nextStatus,
            updatedAt: new Date().toISOString(),
        };
        this.moderation[index] = next;
        this.applyTargetStatus(next.targetType, next.targetId, nextStatus);
        return next;
    }
    applyTargetStatus(targetType, targetId, status) {
        if (targetType === 'review') {
            const index = this.reviews.findIndex((item) => item.id === targetId);
            if (index >= 0) {
                this.reviews[index] = { ...this.reviews[index], status };
            }
        }
        if (targetType === 'community_post') {
            const index = this.posts.findIndex((item) => item.id === targetId);
            if (index >= 0) {
                this.posts[index] = { ...this.posts[index], status };
            }
        }
        if (targetType === 'community_comment') {
            const index = this.comments.findIndex((item) => item.id === targetId);
            if (index >= 0) {
                this.comments[index] = { ...this.comments[index], status };
            }
        }
        if (targetType === 'place_submission') {
            const index = this.submissions.findIndex((item) => item.id === targetId);
            if (index >= 0) {
                this.submissions[index] = { ...this.submissions[index], status };
            }
        }
    }
    getCachedTrustSnapshot(placeId) {
        return this.trustSnapshots.get(placeId) ?? null;
    }
    setTrustSnapshot(snapshot) {
        this.trustSnapshots.set(snapshot.placeId, snapshot);
    }
}
exports.MemoryStore = MemoryStore;
