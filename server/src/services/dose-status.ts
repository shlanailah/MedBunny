export const AWAITING_WINDOW_MS = 60 * 60 * 1000 // 1 jam setelah jadwal masih dianggap "Awaiting"

export type DoseStatus = 'recorded' | 'awaiting' | 'missed' | 'upcoming'

export function doseStatus(
  log: { scheduledAt: Date; confirmedAt: Date | null },
  now = new Date(),
): DoseStatus {
  if (log.confirmedAt) return 'recorded'
  if (log.scheduledAt > now) return 'upcoming'
  if (now.getTime() - log.scheduledAt.getTime() <= AWAITING_WINDOW_MS) return 'awaiting'
  return 'missed'
}
