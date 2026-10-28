import { addDays, eachDayOfInterval, format, parseISO } from 'date-fns'
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz'
import type { Prisma } from '../generated/prisma/client.js'
import { prisma } from '../db.js'

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const

/** Batas rentang yang boleh diminta lewat API. */
export const MAX_RANGE_DAYS = 62
/** Jangan membuat baris dosis lebih dari 7 hari ke depan. */
export const MAX_FUTURE_DAYS = 7

/**
 * Membuat baris dose_logs untuk rentang tanggal tertentu secara lazy.
 * Aman dipanggil berulang kali karena ada @@unique([medicationId, scheduledAt]).
 */
export async function ensureDoseLogs(
  childId: string,
  fromKey: string,
  toKey: string,
  timezone: string,
) {
  const todayKey = formatInTimeZone(new Date(), timezone, 'yyyy-MM-dd')
  const futureLimitKey = format(addDays(parseISO(todayKey), MAX_FUTURE_DAYS), 'yyyy-MM-dd')
  const ensureToKey = toKey < futureLimitKey ? toKey : futureLimitKey

  if (ensureToKey < fromKey) return

  const toEnd = fromZonedTime(`${ensureToKey}T23:59:59.999`, timezone)

  const medications = await prisma.medication.findMany({
    where: {
      childId,
      frequency: { not: 'AS_NEEDED' },
      startDate: { lte: toEnd },
    },
    include: { times: true, days: true },
  })

  const rows: Prisma.DoseLogCreateManyInput[] = []

  for (const medication of medications) {
    const startKey = medication.startDate.toISOString().slice(0, 10)
    const firstKey = startKey > fromKey ? startKey : fromKey
    if (firstKey > ensureToKey) continue

    const calendarDays = eachDayOfInterval({
      start: parseISO(firstKey),
      end: parseISO(ensureToKey),
    })

    for (const day of calendarDays) {
      const dayKey = format(day, 'yyyy-MM-dd')
      const weekday = WEEKDAYS[day.getDay()]

      if (medication.frequency === 'SOME_DAYS' && !medication.days.some(({ day }) => day === weekday)) {
        continue
      }

      for (const { time } of medication.times) {
        rows.push({
          medicationId: medication.id,
          medicationName: medication.name,
          dose: medication.dose,
          scheduledAt: fromZonedTime(`${dayKey}T${time}:00`, timezone),
        })
      }
    }
  }

  if (rows.length > 0) {
    await prisma.doseLog.createMany({ data: rows, skipDuplicates: true })
  }
}
