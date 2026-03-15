"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isOpenNow = void 0;
const parseMinutes = (time) => {
    const [h, m] = time.split(':').map((part) => Number(part));
    return h * 60 + m;
};
const isOpenNow = (openHours, now = new Date(), timezone = 'Asia/Shanghai') => {
    const localNow = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    const day = localNow.getDay();
    const minutes = localNow.getHours() * 60 + localNow.getMinutes();
    for (const slot of openHours) {
        const start = parseMinutes(slot.start);
        const end = parseMinutes(slot.end);
        if (start <= end) {
            if (slot.day === day && minutes >= start && minutes <= end) {
                return true;
            }
            continue;
        }
        if (slot.day === day && minutes >= start) {
            return true;
        }
        const previousDay = ((day + 6) % 7);
        if (slot.day === previousDay && minutes <= end) {
            return true;
        }
    }
    return false;
};
exports.isOpenNow = isOpenNow;
