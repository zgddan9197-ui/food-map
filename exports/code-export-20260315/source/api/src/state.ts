import { campuses, places } from './catalog'

export { campuses, places }

export const campusMap = Object.fromEntries(campuses.map((item) => [item.id, item]))
export const placeMap = Object.fromEntries(places.map((item) => [item.id, item]))

