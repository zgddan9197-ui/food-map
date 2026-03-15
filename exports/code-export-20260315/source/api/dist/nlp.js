"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractIntentTokens = void 0;
const dictionaries = [
    { token: 'spicy', terms: ['辣', '麻辣', '重口'] },
    { token: 'sweet', terms: ['甜', '糖水', '奶茶', '甜品'] },
    { token: 'warm', terms: ['暖', '热汤', '粥', '汤'] },
    { token: 'cheap', terms: ['便宜', '省钱', '学生价', '预算'] },
    { token: 'groupFriendly', terms: ['聚餐', '朋友', '多人', '一起吃'] },
    { token: 'quick', terms: ['赶时间', '快', '马上', '课间'] },
    { token: 'lateNight', terms: ['夜宵', '凌晨', '熬夜', '晚课后'] },
    { token: 'light', terms: ['清淡', '轻食', '低卡'] },
    { token: 'quiet', terms: ['安静', '不吵', '慢慢吃'] },
];
const extractIntentTokens = (text) => {
    const normalized = text.trim().toLowerCase();
    if (!normalized) {
        return [];
    }
    const hits = dictionaries
        .filter((entry) => entry.terms.some((term) => normalized.includes(term)))
        .map((entry) => entry.token);
    return Array.from(new Set(hits));
};
exports.extractIntentTokens = extractIntentTokens;
