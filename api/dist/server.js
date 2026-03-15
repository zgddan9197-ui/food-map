"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_crypto_1 = require("node:crypto");
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const zod_1 = require("zod");
const ai_1 = require("./ai");
const state_1 = require("./state");
const postgres_1 = require("./postgres");
const rate_limit_1 = require("./rate-limit");
const recommendation_1 = require("./recommendation");
const store_1 = require("./store");
const trust_1 = require("./trust");
const app = (0, fastify_1.default)({
    logger: true,
});
const store = new store_1.MemoryStore();
const ai = (0, ai_1.createAiAdapter)();
const mirror = (0, postgres_1.createPgMirror)(process.env.DATABASE_URL);
const limiter = new rate_limit_1.RateLimiter(process.env.REDIS_URL, Number(process.env.RATE_LIMIT_PER_MINUTE ?? '120'));
const adminKey = process.env.ADMIN_KEY ?? 'shike-admin';
const extractSessionToken = (authorization) => {
    if (!authorization) {
        return null;
    }
    const [prefix, token] = authorization.split(' ');
    if (prefix !== 'Bearer' || !token) {
        return null;
    }
    return token.trim();
};
const ensureSession = (authorization) => {
    const token = extractSessionToken(authorization);
    if (!token) {
        return { token: null, session: null };
    }
    const session = store.getSession(token);
    return { token, session };
};
const parseOrReply = (schema, payload) => {
    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
        return { ok: false, error: parsed.error.flatten() };
    }
    return { ok: true, data: parsed.data };
};
const toRecommendationResponse = (item) => ({
    place: {
        id: item.place.id,
        name: item.place.name,
        type: item.place.type,
        campusId: item.place.campusId,
        location: item.place.location,
        cuisines: item.place.cuisines,
        tags: item.place.tags,
        rating: item.place.rating,
        avgPrice: item.place.avgPrice,
        vibeLine: item.place.vibeLine,
        signatureDishes: item.place.signatureDishes,
    },
    recommendation: item.recommendation,
    distanceKm: item.distanceKm,
    openNow: item.openNow,
});
const qualityWeight = (text) => {
    const normalized = text.trim();
    if (!normalized) {
        return 0.6;
    }
    const marketingTerms = ['全网最低', '官方推荐', '绝绝子', '冲冲冲', '闭眼入', '保姆级'];
    const hitCount = marketingTerms.filter((term) => normalized.includes(term)).length;
    if (hitCount === 0) {
        return 1;
    }
    if (hitCount === 1) {
        return 0.65;
    }
    return 0.35;
};
const buildFilteredRanked = async (scene, interestBoost, options) => {
    const campus = state_1.campusMap[scene.campusId];
    if (!campus) {
        return [];
    }
    const scopedPlaces = state_1.places.filter((item) => item.campusId === campus.id);
    const aiHints = await ai.extractIntentHints(scene.freeText);
    const ranked = (0, recommendation_1.buildRankedRecommendations)(scopedPlaces, scene, campus, interestBoost, aiHints);
    return ranked.filter((item) => (!options.openNowOnly || item.openNow) && item.recommendation.walkMinutes <= options.maxWalkMinutes);
};
const routePoints = (batch) => batch.map((item, index) => ({
    order: index + 1,
    id: item.place.id,
    lng: item.place.location.lng,
    lat: item.place.location.lat,
}));
app.register(cors_1.default, {
    origin: true,
});
app.addHook('preHandler', async (request, reply) => {
    const token = extractSessionToken(request.headers.authorization);
    const identity = token ?? request.headers['x-device-id']?.toString() ?? request.ip;
    const result = await limiter.consume(identity);
    reply.header('x-rate-limit-remaining', String(result.remaining));
    reply.header('x-rate-limit-reset', String(result.resetInSeconds));
    if (!result.allowed) {
        return reply.code(429).send({
            error: 'too_many_requests',
            message: '请求过于频繁，请稍后再试。',
        });
    }
});
app.get('/api/v1/health', async () => {
    return {
        ok: true,
        service: 'shike-api',
        now: new Date().toISOString(),
        storage: 'memory',
        campuses: state_1.campuses.length,
        places: state_1.places.length,
    };
});
app.post('/api/v1/ai/intent', async (request, reply) => {
    const parsed = parseOrReply(zod_1.z.object({
        text: zod_1.z.string().max(220).default(''),
    }), request.body);
    if (!parsed.ok) {
        return reply.code(400).send({ error: 'invalid_payload', details: parsed.error });
    }
    const text = parsed.data.text.trim();
    if (!text) {
        return {
            hints: [],
            provider: ai.getProvider(),
            fallback: true,
        };
    }
    const hints = await ai.extractIntentHints(text);
    return {
        hints,
        provider: ai.getProvider(),
        fallback: hints.length === 0,
    };
});
app.post('/api/v1/ai/scene-parse', async (request, reply) => {
    const parsed = parseOrReply(zod_1.z.object({
        text: zod_1.z.string().max(220).default(''),
    }), request.body);
    if (!parsed.ok) {
        return reply.code(400).send({ error: 'invalid_payload', details: parsed.error });
    }
    const text = parsed.data.text.trim();
    if (!text) {
        return {
            params: {
                cuisine: '',
                budget: '',
                distance: '',
            },
            provider: ai.getProvider(),
            fallback: true,
        };
    }
    const params = await ai.parseSceneParams(text);
    return {
        params,
        provider: ai.getProvider(),
        fallback: !params.cuisine && !params.budget && !params.distance,
    };
});
app.post('/api/v1/ai/supplement-places', async (request, reply) => {
    const parsed = parseOrReply(zod_1.z.object({
        cuisine: zod_1.z.string().min(1).max(40),
        maxItems: zod_1.z.number().int().min(1).max(4).optional().default(2),
    }), request.body);
    if (!parsed.ok) {
        return reply.code(400).send({ error: 'invalid_payload', details: parsed.error });
    }
    const places = await ai.generateSupplementPlaces(parsed.data.cuisine);
    return {
        places: places.slice(0, parsed.data.maxItems),
        provider: ai.getProvider(),
        fallback: places.length === 0,
    };
});
app.post('/api/v1/anon/session', async (request, reply) => {
    const parsed = parseOrReply(zod_1.z.object({
        deviceId: zod_1.z.string().min(6).max(128).optional(),
    }), request.body);
    if (!parsed.ok) {
        return reply.code(400).send({ error: 'invalid_payload', details: parsed.error });
    }
    const deviceId = parsed.data.deviceId ?? `dev_${(0, node_crypto_1.randomUUID)()}`;
    const session = store.createSession(deviceId);
    void mirror.saveSession(session);
    return {
        anonymousToken: session.token,
        deviceId: session.deviceId,
        createdAt: session.createdAt,
    };
});
app.post('/api/v1/recommendations', async (request, reply) => {
    const auth = ensureSession(request.headers.authorization);
    if (!auth.session || !auth.token) {
        return reply.code(401).send({ error: 'unauthorized' });
    }
    const parsed = parseOrReply(zod_1.z.object({
        campusId: zod_1.z.string(),
        people: zod_1.z.enum(['solo', 'smallGroup', 'group']),
        mealTime: zod_1.z.enum(['breakfast', 'lunch', 'dinner', 'lateNight']),
        urgency: zod_1.z.enum(['rush', 'normal', 'relax']),
        freeText: zod_1.z.string().max(200).default(''),
        openNowOnly: zod_1.z.boolean().optional().default(false),
        maxWalkMinutes: zod_1.z.number().int().min(8).max(60).optional().default(30),
    }), request.body);
    if (!parsed.ok) {
        return reply.code(400).send({ error: 'invalid_payload', details: parsed.error });
    }
    const campus = state_1.campusMap[parsed.data.campusId];
    if (!campus) {
        return reply.code(404).send({ error: 'campus_not_found' });
    }
    const scene = {
        campusId: parsed.data.campusId,
        people: parsed.data.people,
        mealTime: parsed.data.mealTime,
        urgency: parsed.data.urgency,
        freeText: parsed.data.freeText,
    };
    const filteredRanked = await buildFilteredRanked(scene, {}, parsed.data);
    const firstBatch = (0, recommendation_1.selectNextBatch)(filteredRanked, new Set(), new Set(), 5);
    const sceneSession = store.createSceneSession(auth.token, scene);
    void mirror.saveSceneSession(sceneSession);
    store.setSceneSeenIds(sceneSession.id, new Set(firstBatch.map((item) => item.place.id)));
    void mirror.saveRecommendations(firstBatch.map((item) => ({
        sceneId: sceneSession.id,
        placeId: item.place.id,
        score: item.recommendation.score,
        reason: item.recommendation.reason,
        walkMinutes: item.recommendation.walkMinutes,
    })));
    const sceneEvent = store.pushEvent({
        name: 'scene_submit',
        sessionToken: auth.token,
        payload: {
            sceneId: sceneSession.id,
            campusId: scene.campusId,
            totalCandidates: filteredRanked.length,
        },
    });
    void mirror.saveUserEvent(sceneEvent);
    return {
        sceneId: sceneSession.id,
        recommendations: firstBatch.map(toRecommendationResponse),
        totalCandidates: filteredRanked.length,
        route: routePoints(firstBatch),
    };
});
app.post('/api/v1/recommendations/:sceneId/refresh', async (request, reply) => {
    const auth = ensureSession(request.headers.authorization);
    if (!auth.session || !auth.token) {
        return reply.code(401).send({ error: 'unauthorized' });
    }
    const paramsParsed = parseOrReply(zod_1.z.object({ sceneId: zod_1.z.string() }), request.params);
    if (!paramsParsed.ok) {
        return reply.code(400).send({ error: 'invalid_scene_id', details: paramsParsed.error });
    }
    const bodyParsed = parseOrReply(zod_1.z.object({
        previousIds: zod_1.z.array(zod_1.z.string()).max(20).default([]),
        openNowOnly: zod_1.z.boolean().optional().default(false),
        maxWalkMinutes: zod_1.z.number().int().min(8).max(60).optional().default(30),
        interestBoost: zod_1.z.record(zod_1.z.string(), zod_1.z.number()).optional().default({}),
    }), request.body);
    if (!bodyParsed.ok) {
        return reply.code(400).send({ error: 'invalid_payload', details: bodyParsed.error });
    }
    const sceneSession = store.getSceneSession(paramsParsed.data.sceneId);
    if (!sceneSession) {
        return reply.code(404).send({ error: 'scene_not_found' });
    }
    if (sceneSession.sessionToken !== auth.token) {
        return reply.code(403).send({ error: 'forbidden_scene' });
    }
    const filteredRanked = await buildFilteredRanked(sceneSession.scene, bodyParsed.data.interestBoost, bodyParsed.data);
    const previousIds = new Set(bodyParsed.data.previousIds);
    const seenIds = store.getSceneSeenIds(sceneSession.id);
    const nextBatch = (0, recommendation_1.selectNextBatch)(filteredRanked, previousIds, seenIds, 5);
    const nextSeen = new Set([...Array.from(seenIds), ...nextBatch.map((item) => item.place.id)]);
    const newCount = nextBatch.filter((item) => !seenIds.has(item.place.id)).length;
    store.setSceneSeenIds(sceneSession.id, nextSeen);
    void mirror.saveRecommendations(nextBatch.map((item) => ({
        sceneId: sceneSession.id,
        placeId: item.place.id,
        score: item.recommendation.score,
        reason: item.recommendation.reason,
        walkMinutes: item.recommendation.walkMinutes,
    })));
    const refreshEvent = store.pushEvent({
        name: 'batch_refresh',
        sessionToken: auth.token,
        payload: {
            sceneId: sceneSession.id,
            newCount,
            total: nextBatch.length,
        },
    });
    void mirror.saveUserEvent(refreshEvent);
    return {
        sceneId: sceneSession.id,
        recommendations: nextBatch.map(toRecommendationResponse),
        route: routePoints(nextBatch),
        policy: {
            requiredNewCount: 2,
            actualNewCount: newCount,
        },
    };
});
app.get('/api/v1/restaurants/:id', async (request, reply) => {
    const parsed = parseOrReply(zod_1.z.object({ id: zod_1.z.string() }), request.params);
    if (!parsed.ok) {
        return reply.code(400).send({ error: 'invalid_id', details: parsed.error });
    }
    const place = state_1.placeMap[parsed.data.id];
    if (!place) {
        return reply.code(404).send({ error: 'place_not_found' });
    }
    const cached = store.getCachedTrustSnapshot(place.id);
    const snapshot = cached ??
        (await (0, trust_1.buildTrustSnapshot)(place, store.getReviewsByPlace(place.id), store.getRecentDecisionsForPlace(place.id, 30), ai));
    store.setTrustSnapshot(snapshot);
    void mirror.saveTrustSnapshot(snapshot);
    return {
        place: {
            ...place,
            trustSignals: snapshot,
            stallHint: place.type === 'stall'
                ? {
                    locationHint: `${place.address} 附近，按同学反馈可见`,
                    activeHoursHint: '建议以现场出摊时间为准',
                }
                : null,
        },
    };
});
app.post('/api/v1/decisions/go', async (request, reply) => {
    const auth = ensureSession(request.headers.authorization);
    if (!auth.session || !auth.token) {
        return reply.code(401).send({ error: 'unauthorized' });
    }
    const parsed = parseOrReply(zod_1.z.object({
        sceneId: zod_1.z.string(),
        placeId: zod_1.z.string(),
    }), request.body);
    if (!parsed.ok) {
        return reply.code(400).send({ error: 'invalid_payload', details: parsed.error });
    }
    const sceneSession = store.getSceneSession(parsed.data.sceneId);
    if (!sceneSession) {
        return reply.code(404).send({ error: 'scene_not_found' });
    }
    if (sceneSession.sessionToken !== auth.token) {
        return reply.code(403).send({ error: 'forbidden_scene' });
    }
    const place = state_1.placeMap[parsed.data.placeId];
    if (!place) {
        return reply.code(404).send({ error: 'place_not_found' });
    }
    const decision = store.createDecision(sceneSession.id, place.id, auth.token);
    void mirror.saveDecision(decision);
    const dueAt = new Date(Date.now() + 90 * 60 * 1000).toISOString();
    const notification = store.createNotification(auth.token, '吃完了吗？', `刚才你去了「${place.name}」，感觉怎么样？`, dueAt);
    void mirror.saveNotification(notification);
    const goEvent = store.pushEvent({
        name: 'go_this_place',
        sessionToken: auth.token,
        payload: {
            sceneId: sceneSession.id,
            placeId: place.id,
            decisionId: decision.id,
        },
    });
    void mirror.saveUserEvent(goEvent);
    return {
        decisionId: decision.id,
        notificationDueAt: dueAt,
    };
});
app.post('/api/v1/reviews', async (request, reply) => {
    const auth = ensureSession(request.headers.authorization);
    if (!auth.session || !auth.token) {
        return reply.code(401).send({ error: 'unauthorized' });
    }
    const parsed = parseOrReply(zod_1.z.object({
        placeId: zod_1.z.string(),
        tags: zod_1.z.array(zod_1.z.string()).max(12).default([]),
        text: zod_1.z.string().max(600).default(''),
        images: zod_1.z.array(zod_1.z.string().url()).max(4).default([]),
    }), request.body);
    if (!parsed.ok) {
        return reply.code(400).send({ error: 'invalid_payload', details: parsed.error });
    }
    const place = state_1.placeMap[parsed.data.placeId];
    if (!place) {
        return reply.code(404).send({ error: 'place_not_found' });
    }
    const weight = qualityWeight(parsed.data.text);
    const review = store.createReview({
        placeId: parsed.data.placeId,
        sessionToken: auth.token,
        tags: parsed.data.tags,
        text: parsed.data.text,
        images: parsed.data.images,
        qualityWeight: weight,
    });
    void mirror.saveReview(review);
    const reviewMod = store.createModerationItem('review', review.id, '用户评论需审核后进入信任信号');
    void mirror.saveModeration(reviewMod);
    const reviewEvent = store.pushEvent({
        name: 'review_submit',
        sessionToken: auth.token,
        payload: {
            reviewId: review.id,
            placeId: review.placeId,
            qualityWeight: review.qualityWeight,
        },
    });
    void mirror.saveUserEvent(reviewEvent);
    return {
        reviewId: review.id,
        status: review.status,
        qualityWeight: review.qualityWeight,
    };
});
app.get('/api/v1/community/posts', async (request, reply) => {
    const parsed = parseOrReply(zod_1.z.object({
        placeId: zod_1.z.string().optional(),
    }), request.query);
    if (!parsed.ok) {
        return reply.code(400).send({ error: 'invalid_query', details: parsed.error });
    }
    const placeId = parsed.data.placeId;
    const rows = store
        .listApprovedPosts()
        .filter((post) => !placeId || post.placeId === placeId)
        .map((post) => ({
        ...post,
        placeName: post.placeId ? state_1.placeMap[post.placeId]?.name ?? null : null,
        comments: store.listApprovedCommentsByPost(post.id),
    }));
    return { posts: rows };
});
app.post('/api/v1/community/posts', async (request, reply) => {
    const auth = ensureSession(request.headers.authorization);
    if (!auth.session || !auth.token) {
        return reply.code(401).send({ error: 'unauthorized' });
    }
    const parsed = parseOrReply(zod_1.z.object({
        author: zod_1.z.string().min(2).max(40),
        title: zod_1.z.string().min(3).max(80),
        body: zod_1.z.string().min(3).max(600),
        placeId: zod_1.z.string().optional().nullable(),
        tags: zod_1.z.array(zod_1.z.string()).max(8).default([]),
    }), request.body);
    if (!parsed.ok) {
        return reply.code(400).send({ error: 'invalid_payload', details: parsed.error });
    }
    if (parsed.data.placeId && !state_1.placeMap[parsed.data.placeId]) {
        return reply.code(404).send({ error: 'place_not_found' });
    }
    const post = store.createPost({
        sessionToken: auth.token,
        author: parsed.data.author,
        title: parsed.data.title,
        body: parsed.data.body,
        placeId: parsed.data.placeId ?? null,
        tags: parsed.data.tags,
    });
    void mirror.saveCommunityPost(post);
    const postMod = store.createModerationItem('community_post', post.id, '社区内容默认先审后发');
    void mirror.saveModeration(postMod);
    const postEvent = store.pushEvent({
        name: 'community_post',
        sessionToken: auth.token,
        payload: {
            postId: post.id,
            placeId: post.placeId,
        },
    });
    void mirror.saveUserEvent(postEvent);
    return {
        postId: post.id,
        status: post.status,
    };
});
app.post('/api/v1/community/posts/:postId/comments', async (request, reply) => {
    const auth = ensureSession(request.headers.authorization);
    if (!auth.session || !auth.token) {
        return reply.code(401).send({ error: 'unauthorized' });
    }
    const paramsParsed = parseOrReply(zod_1.z.object({ postId: zod_1.z.string() }), request.params);
    if (!paramsParsed.ok) {
        return reply.code(400).send({ error: 'invalid_params', details: paramsParsed.error });
    }
    const bodyParsed = parseOrReply(zod_1.z.object({
        content: zod_1.z.string().min(1).max(300),
    }), request.body);
    if (!bodyParsed.ok) {
        return reply.code(400).send({ error: 'invalid_payload', details: bodyParsed.error });
    }
    const post = store.getPost(paramsParsed.data.postId);
    if (!post) {
        return reply.code(404).send({ error: 'post_not_found' });
    }
    const comment = store.createComment({
        postId: paramsParsed.data.postId,
        sessionToken: auth.token,
        content: bodyParsed.data.content,
    });
    void mirror.saveCommunityComment(comment);
    const commentMod = store.createModerationItem('community_comment', comment.id, '评论默认先审后发');
    void mirror.saveModeration(commentMod);
    return {
        commentId: comment.id,
        status: comment.status,
    };
});
app.post('/api/v1/submissions/place', async (request, reply) => {
    const auth = ensureSession(request.headers.authorization);
    if (!auth.session || !auth.token) {
        return reply.code(401).send({ error: 'unauthorized' });
    }
    const parsed = parseOrReply(zod_1.z.object({
        name: zod_1.z.string().min(2).max(80),
        type: zod_1.z.enum(['restaurant', 'stall']),
        campusId: zod_1.z.string(),
        addressHint: zod_1.z.string().min(2).max(120),
        note: zod_1.z.string().max(500).default(''),
    }), request.body);
    if (!parsed.ok) {
        return reply.code(400).send({ error: 'invalid_payload', details: parsed.error });
    }
    if (!state_1.campusMap[parsed.data.campusId]) {
        return reply.code(404).send({ error: 'campus_not_found' });
    }
    const submission = store.createSubmission({
        sessionToken: auth.token,
        name: parsed.data.name,
        type: parsed.data.type,
        campusId: parsed.data.campusId,
        addressHint: parsed.data.addressHint,
        note: parsed.data.note,
    });
    void mirror.saveSubmission(submission);
    const submissionMod = store.createModerationItem('place_submission', submission.id, '用户众包新店需要运营审核');
    void mirror.saveModeration(submissionMod);
    return {
        submissionId: submission.id,
        status: submission.status,
    };
});
app.get('/api/v1/notifications/in-app', async (request, reply) => {
    const auth = ensureSession(request.headers.authorization);
    if (!auth.session || !auth.token) {
        return reply.code(401).send({ error: 'unauthorized' });
    }
    const notifications = store.listDueNotifications(auth.token);
    return {
        notifications,
    };
});
app.post('/api/v1/notifications/:id/ack', async (request, reply) => {
    const auth = ensureSession(request.headers.authorization);
    if (!auth.session || !auth.token) {
        return reply.code(401).send({ error: 'unauthorized' });
    }
    const parsed = parseOrReply(zod_1.z.object({ id: zod_1.z.string() }), request.params);
    if (!parsed.ok) {
        return reply.code(400).send({ error: 'invalid_id', details: parsed.error });
    }
    const ok = store.acknowledgeNotification(parsed.data.id, auth.token);
    if (!ok) {
        return reply.code(404).send({ error: 'notification_not_found' });
    }
    return {
        ok: true,
    };
});
app.get('/api/v1/admin/moderation/queue', async (request, reply) => {
    if (request.headers['x-admin-key'] !== adminKey) {
        return reply.code(403).send({ error: 'forbidden' });
    }
    return {
        items: store.listPendingModeration(),
    };
});
app.post('/api/v1/admin/moderation/:id/action', async (request, reply) => {
    if (request.headers['x-admin-key'] !== adminKey) {
        return reply.code(403).send({ error: 'forbidden' });
    }
    const paramsParsed = parseOrReply(zod_1.z.object({ id: zod_1.z.string() }), request.params);
    if (!paramsParsed.ok) {
        return reply.code(400).send({ error: 'invalid_id', details: paramsParsed.error });
    }
    const bodyParsed = parseOrReply(zod_1.z.object({
        action: zod_1.z.enum(['approve', 'reject']),
    }), request.body);
    if (!bodyParsed.ok) {
        return reply.code(400).send({ error: 'invalid_payload', details: bodyParsed.error });
    }
    const item = store.moderate(paramsParsed.data.id, bodyParsed.data.action);
    if (!item) {
        return reply.code(404).send({ error: 'moderation_item_not_found' });
    }
    void mirror.updateModeration(item);
    return {
        item,
    };
});
const start = async () => {
    try {
        await mirror.init();
        const port = Number(process.env.API_PORT ?? '8787');
        const host = process.env.API_HOST ?? '0.0.0.0';
        await app.listen({ port, host });
        app.log.info(`API listening at http://${host}:${port}`);
    }
    catch (error) {
        app.log.error(error);
        process.exit(1);
    }
};
void start();
