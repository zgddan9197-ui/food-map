"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.selectNextBatch = exports.buildRankedRecommendations = void 0;
const geo_1 = require("./geo");
const nlp_1 = require("./nlp");
const time_1 = require("./time");
const intentToTerms = {
    spicy: ['辣', '麻辣', '川味'],
    sweet: ['甜', '糖水', '甜品'],
    warm: ['暖胃', '汤', '粥'],
    cheap: ['便宜', '性价比', '学生'],
    groupFriendly: ['聚餐', '朋友', '拼桌'],
    quick: ['出餐快', '极快出餐', '打包方便'],
    lateNight: ['夜宵', '凌晨', '晚课后'],
    light: ['轻食', '清爽', '低负担'],
    quiet: ['慢慢吃', '环境好', '安静'],
};
const containsAny = (source, terms) => terms.some((term) => source.some((text) => text.includes(term)));
const scoreByScene = (place, scene) => {
    let score = 0;
    if (scene.people === 'solo' && place.tags.some((tag) => tag.includes('一人食'))) {
        score += 8;
    }
    if (scene.people === 'smallGroup' && containsAny(place.tags, ['朋友', '两人', '拼桌'])) {
        score += 6;
    }
    if (scene.people === 'group' && containsAny(place.tags, ['聚餐', '社团', '拼桌'])) {
        score += 8;
    }
    if (scene.mealTime === 'breakfast' && containsAny([...place.cuisines, ...place.tags], ['早餐', '粥', '煎饼'])) {
        score += 7;
    }
    if (scene.mealTime === 'lunch' && containsAny(place.tags, ['午餐', '轻食', '出餐快'])) {
        score += 6;
    }
    if (scene.mealTime === 'dinner' && containsAny(place.tags, ['晚餐', '聚餐', '下饭'])) {
        score += 6;
    }
    if (scene.mealTime === 'lateNight' && containsAny(place.tags, ['夜宵', '晚课后', '暖胃'])) {
        score += 9;
    }
    if (scene.urgency === 'rush') {
        if (place.mealServiceSpeed === 'fast') {
            score += 10;
        }
        if (place.mealServiceSpeed === 'normal') {
            score += 3;
        }
    }
    if (scene.urgency === 'relax' && place.mealServiceSpeed === 'slow') {
        score += 5;
    }
    return score;
};
const scoreByIntent = (place, freeText, aiHints) => {
    const tokens = (0, nlp_1.extractIntentTokens)(`${freeText} ${aiHints.join(' ')}`);
    if (tokens.length === 0) {
        return 0;
    }
    const texts = [place.name, ...place.cuisines, ...place.tags];
    return tokens.reduce((sum, token) => {
        return containsAny(texts, intentToTerms[token]) ? sum + 8 : sum;
    }, 0);
};
const scoreByTrust = (place) => {
    const ratingScore = place.rating * 8;
    const revisitScore = place.trustSignals.revisitRate30d * 0.35;
    const reviewScore = Math.log10(place.reviewCount + 10) * 6;
    return ratingScore + revisitScore + reviewScore;
};
const scoreByDistance = (distanceKm, scene, serviceSpeed) => {
    const basePenalty = scene.urgency === 'rush' ? 6.5 : 4.5;
    const speedBonus = serviceSpeed === 'fast' ? 2 : 0;
    return 25 - distanceKm * basePenalty + speedBonus;
};
const scoreByInterestBoost = (place, boost) => {
    const allTags = [...place.cuisines, ...place.tags];
    return allTags.reduce((sum, tag) => sum + (boost[tag] ?? 0), 0);
};
const createReason = (place, walkMinutes, scene, openNow) => {
    const timeLabel = scene.mealTime === 'breakfast'
        ? '早餐'
        : scene.mealTime === 'lunch'
            ? '午餐'
            : scene.mealTime === 'dinner'
                ? '晚餐'
                : '宵夜';
    const speedLabel = place.mealServiceSpeed === 'fast'
        ? `${timeLabel}出餐快`
        : place.mealServiceSpeed === 'slow'
            ? `${timeLabel}氛围更适合慢慢吃`
            : `${timeLabel}节奏稳定`;
    const openLabel = openNow ? '当前营业中' : '稍后营业';
    const trustKeyword = place.trustSignals.keywords[0] ?? '口碑稳定';
    return `步行约 ${walkMinutes} 分钟，${speedLabel}，多人提到“${trustKeyword}”，${openLabel}`;
};
const scorePlace = (place, scene, campus, interestBoost, aiHints) => {
    const distanceKm = (0, geo_1.calcDistanceKm)(campus.center, place.location);
    const walkMinutes = (0, geo_1.estimateWalkMinutes)(distanceKm);
    const openNow = (0, time_1.isOpenNow)(place.openHours);
    let score = 0;
    score += scoreByScene(place, scene);
    score += scoreByIntent(place, scene.freeText, aiHints);
    score += scoreByTrust(place);
    score += scoreByDistance(distanceKm, scene, place.mealServiceSpeed);
    score += scoreByInterestBoost(place, interestBoost);
    score += openNow ? 8 : -6;
    const reason = createReason(place, walkMinutes, scene, openNow);
    return { score, reason, distanceKm, openNow, walkMinutes };
};
const buildRankedRecommendations = (places, scene, campus, interestBoost, aiHints) => {
    const ranked = places.map((place) => {
        const result = scorePlace(place, scene, campus, interestBoost, aiHints);
        const recommendation = {
            id: place.id,
            score: Math.round(result.score * 100) / 100,
            reason: result.reason,
            walkMinutes: result.walkMinutes,
        };
        return {
            place,
            recommendation,
            distanceKm: result.distanceKm,
            openNow: result.openNow,
        };
    });
    ranked.sort((a, b) => b.recommendation.score - a.recommendation.score);
    return ranked;
};
exports.buildRankedRecommendations = buildRankedRecommendations;
const selectNextBatch = (ranked, previousBatchIds, seenIds, size = 5) => {
    if (ranked.length <= size) {
        return ranked;
    }
    const picked = [];
    const pickedIds = new Set();
    const pickFrom = (pool, limit) => {
        for (const item of pool) {
            if (picked.length >= limit) {
                break;
            }
            if (pickedIds.has(item.place.id)) {
                continue;
            }
            picked.push(item);
            pickedIds.add(item.place.id);
        }
    };
    const targetNewCount = Math.ceil(size * 0.4);
    const newPool = ranked.filter((item) => !seenIds.has(item.place.id));
    pickFrom(newPool, targetNewCount);
    const nonPreviousPool = ranked.filter((item) => !previousBatchIds.has(item.place.id));
    pickFrom(nonPreviousPool, size);
    if (picked.length < size) {
        pickFrom(ranked, size);
    }
    return picked.slice(0, size);
};
exports.selectNextBatch = selectNextBatch;
