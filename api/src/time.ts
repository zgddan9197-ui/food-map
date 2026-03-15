import type { OpenHourSlot } from './types'

const parseMinutes = (time: string): number => {
  const [h, m] = time.split(':').map((part) => Number(part))
  return h * 60 + m
}

export const isOpenNow = (
  openHours: OpenHourSlot[],
  now = new Date(),
  timezone = 'Asia/Shanghai',
): boolean => {
  const localNow = new Date(now.toLocaleString('en-US', { timeZone: timezone }))
  const day = localNow.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6
  const minutes = localNow.getHours() * 60 + localNow.getMinutes()

  for (const slot of openHours) {
    const start = parseMinutes(slot.start)
    const end = parseMinutes(slot.end)

    if (start <= end) {
      if (slot.day === day && minutes >= start && minutes <= end) {
        return true
      }
      continue
    }

    if (slot.day === day && minutes >= start) {
      return true
    }

    const previousDay = ((day + 6) % 7) as 0 | 1 | 2 | 3 | 4 | 5 | 6
    if (slot.day === previousDay && minutes <= end) {
      return true
    }
  }

  return false
}

