"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.estimateWalkMinutes = exports.estimateWalkDistanceKm = exports.calcDistanceKm = void 0;
const EARTH_RADIUS_KM = 6371;
const WALK_MULTIPLIER = 1.25;
const METERS_PER_MINUTE = 78;
const toRad = (deg) => (deg * Math.PI) / 180;
const calcDistanceKm = (from, to) => {
    const dLat = toRad(to.lat - from.lat);
    const dLng = toRad(to.lng - from.lng);
    const lat1 = toRad(from.lat);
    const lat2 = toRad(to.lat);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return EARTH_RADIUS_KM * c;
};
exports.calcDistanceKm = calcDistanceKm;
const estimateWalkDistanceKm = (distanceKm) => distanceKm * WALK_MULTIPLIER;
exports.estimateWalkDistanceKm = estimateWalkDistanceKm;
const estimateWalkMinutes = (distanceKm) => {
    const walkMeters = (0, exports.estimateWalkDistanceKm)(distanceKm) * 1000;
    return Math.max(1, Math.ceil(walkMeters / METERS_PER_MINUTE));
};
exports.estimateWalkMinutes = estimateWalkMinutes;
