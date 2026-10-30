import type {
  Child,
  DoseLog,
  Medication,
  MedicationDay,
  MedicationTime,
  User,
} from '../generated/prisma/client.js'
import { doseStatus } from '../services/dose-status.js'

export function toUserDto(user: User) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
  }
}

export function toChildDto(child: Pick<Child, 'id' | 'nickname' | 'birthYear'>) {
  return {
    id: child.id,
    nickname: child.nickname,
    birthYear: child.birthYear,
  }
}

type MedicationWithSchedule = Medication & {
  times: MedicationTime[]
  days: MedicationDay[]
}

export function toMedicationDto(medication: MedicationWithSchedule) {
  return {
    id: medication.id,
    name: medication.name,
    dose: medication.dose,
    startDate: medication.startDate.toISOString().slice(0, 10),
    frequency: medication.frequency,
    meal: medication.meal,
    note: medication.note,
    times: medication.times.map(({ time }) => time).sort(),
    days: medication.days.map(({ day }) => day),
    createdAt: medication.createdAt.toISOString(),
    updatedAt: medication.updatedAt.toISOString(),
  }
}

export function toDoseDto(log: DoseLog) {
  return {
    id: log.id,
    medicationId: log.medicationId,
    medicationName: log.medicationName,
    dose: log.dose,
    scheduledAt: log.scheduledAt.toISOString(),
    confirmedAt: log.confirmedAt?.toISOString() ?? null,
    status: doseStatus(log),
  }
}
