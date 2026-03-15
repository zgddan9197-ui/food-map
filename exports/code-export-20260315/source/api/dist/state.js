"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.placeMap = exports.campusMap = exports.places = exports.campuses = void 0;
const catalog_1 = require("./catalog");
Object.defineProperty(exports, "campuses", { enumerable: true, get: function () { return catalog_1.campuses; } });
Object.defineProperty(exports, "places", { enumerable: true, get: function () { return catalog_1.places; } });
exports.campusMap = Object.fromEntries(catalog_1.campuses.map((item) => [item.id, item]));
exports.placeMap = Object.fromEntries(catalog_1.places.map((item) => [item.id, item]));
