const EARTH_RADIUS_KM = 6371
const WALK_MULTIPLIER = 1.25
const METERS_PER_MINUTE = 78

export interface Point {
  lng: number
  lat: number
}

const toRad = (deg: number): number => (deg * Math.PI) / 180

export const calcDistanceKm = (from: Point, to: Point): number => {
  const dLat = toRad(to.lat - from.lat)
  const dLng = toRad(to.lng - from.lng)
  const lat1 = toRad(from.lat)
  const lat2 = toRad(to.lat)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return EARTH_RADIUS_KM * c
}

export const estimateWalkDistanceKm = (distanceKm: number): number => distanceKm * WALK_MULTIPLIER

export const estimateWalkMinutes = (distanceKm: number): number => {
  const walkMeters = estimateWalkDistanceKm(distanceKm) * 1000
  return Math.max(1, Math.ceil(walkMeters / METERS_PER_MINUTE))
}

