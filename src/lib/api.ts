export type ApiFrequency = 'EVERY_DAY' | 'SOME_DAYS' | 'AS_NEEDED'
export type ApiMealTiming = 'BEFORE_MEAL' | 'AFTER_MEAL' | 'ANYTIME'
export type ApiWeekday = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN'
export type DoseStatus = 'recorded' | 'awaiting' | 'missed' | 'upcoming'

export type SessionUser = {
  id: string
  name: string
  email: string
}

export type Child = {
  id: string
  nickname: string | null
  birthYear: number | null
}

export type SessionMode = 'parent' | 'child'

export type Session = {
  user: SessionUser
  children: Child[]
  mode: SessionMode
  childId: string | null
}

export type ApiMedication = {
  id: string
  name: string
  dose: string
  startDate: string
  frequency: ApiFrequency
  meal: ApiMealTiming
  note: string | null
  times: string[]
  days: ApiWeekday[]
  createdAt: string
  updatedAt: string
}

/**
 * Bentuk yang dipakai form frontend. Label tetap seperti yang terlihat
 * di UI; konversi ke enum API dilakukan di file ini.
 */
export type Medication = {
  id: string
  name: string
  dose: string
  note: string
  time: string
  startDate: string
  frequency: string
  times: string[]
  meal: string
  days: string[]
}

export type MedicationDraft = Omit<Medication, 'id'>

export type MedicationInput = {
  name: string
  dose: string
  startDate: string
  frequency: ApiFrequency
  times: string[]
  meal: ApiMealTiming
  days: ApiWeekday[]
  note?: string
}

export type DoseLog = {
  id: string
  medicationId: string
  medicationName: string
  dose: string
  scheduledAt: string
  confirmedAt: string | null
  status: DoseStatus
}

export type DoseQuery = {
  from: string
  to: string
  status?: DoseStatus
  q?: string
}

export type ConfirmDoseResult = {
  dose: DoseLog
  starBalance: number
}

export type GameId = 'garden' | 'style' | 'match-up' | 'color-hunt'

export type KidsSession = {
  endsAt: string
  reminderAt: string | null
}

export type KidsState = {
  childName: string
  bunny: 'sleeping' | 'awake'
  starBalance: number
  session: KidsSession | null
}

export type KidsSettings = {
  sessionMinutes: number
  endReminder: boolean
  reminderBeforeMinutes: number
}

export type Stars = {
  balance: number
  earned: number
}

const FREQUENCY_TO_API: Record<string, ApiFrequency> = {
  'Every day': 'EVERY_DAY',
  'Some days': 'SOME_DAYS',
  'As needed': 'AS_NEEDED',
}

const FREQUENCY_FROM_API: Record<ApiFrequency, string> = {
  EVERY_DAY: 'Every day',
  SOME_DAYS: 'Some days',
  AS_NEEDED: 'As needed',
}

const MEAL_TO_API: Record<string, ApiMealTiming> = {
  'Before a meal': 'BEFORE_MEAL',
  'After a meal': 'AFTER_MEAL',
  Anytime: 'ANYTIME',
}

const MEAL_FROM_API: Record<ApiMealTiming, string> = {
  BEFORE_MEAL: 'Before a meal',
  AFTER_MEAL: 'After a meal',
  ANYTIME: 'Anytime',
}

const WEEKDAY_TO_API: Record<string, ApiWeekday> = {
  Mon: 'MON',
  Tue: 'TUE',
  Wed: 'WED',
  Thu: 'THU',
  Fri: 'FRI',
  Sat: 'SAT',
  Sun: 'SUN',
}

const WEEKDAY_FROM_API: Record<ApiWeekday, string> = {
  MON: 'Mon',
  TUE: 'Tue',
  WED: 'Wed',
  THU: 'Thu',
  FRI: 'Fri',
  SAT: 'Sat',
  SUN: 'Sun',
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly field?: string,
    public readonly details: Record<string, unknown> = {},
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export function fromApiMedication(medication: ApiMedication): Medication {
  return {
    id: medication.id,
    name: medication.name,
    dose: medication.dose,
    note: medication.note ?? '',
    time: medication.times[0] ?? '',
    startDate: medication.startDate,
    frequency: FREQUENCY_FROM_API[medication.frequency],
    times: medication.times,
    meal: MEAL_FROM_API[medication.meal],
    days: medication.days.map((day) => WEEKDAY_FROM_API[day]),
  }
}

function toMedicationInput(medication: MedicationDraft): MedicationInput {
  return {
    name: medication.name.trim(),
    dose: medication.dose.trim(),
    startDate: medication.startDate,
    frequency: FREQUENCY_TO_API[medication.frequency] ?? 'EVERY_DAY',
    times: medication.frequency === 'As needed' ? [] : medication.times,
    meal: MEAL_TO_API[medication.meal] ?? 'ANYTIME',
    days:
      medication.frequency === 'Some days'
        ? medication.days.map((day) => WEEKDAY_TO_API[day]).filter(Boolean)
        : [],
    note: medication.note.trim() || undefined,
  }
}

type RequestOptions = RequestInit & {
  skipAuthRedirect?: boolean
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { skipAuthRedirect, ...init } = options
  const headers = new Headers(init.headers)

  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  let response: Response
  try {
    response = await fetch(`/api${path}`, {
      ...init,
      credentials: 'include',
      headers,
    })
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Unable to reach the server. Please try again in a moment.')
  }

  if (response.status === 204) return undefined as T

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    const error = data?.error as
      | { code?: string; message?: string; field?: string; [key: string]: unknown }
      | undefined

    if (response.status === 401 && !skipAuthRedirect) {
      window.dispatchEvent(new Event('medbunny:unauthorized'))
    }

    if (response.status === 403 && error?.code === 'PARENT_MODE_REQUIRED') {
      window.dispatchEvent(new Event('medbunny:parent-required'))
    }

    const { code, message, field, ...details } = error ?? {}

    throw new ApiError(
      response.status,
      code ?? 'REQUEST_FAILED',
      message ?? 'Something went wrong. Please try again in a moment.',
      field,
      details,
    )
  }

  return data as T
}

export function formatApiDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const api = {
  signup(input: { name: string; email: string; password: string }) {
    return request<Session>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },

  login(input: { email: string; password: string }) {
    return request<Session>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },

  logout() {
    return request<void>('/auth/logout', { method: 'POST' })
  },

  me() {
    return request<Session>('/auth/me', { skipAuthRedirect: true })
  },

  async listMedications(childId: string) {
    const medications = await request<ApiMedication[]>(`/children/${childId}/medications`)
    return medications.map(fromApiMedication)
  },

  async createMedication(childId: string, draft: MedicationDraft) {
    const medication = await request<ApiMedication>(`/children/${childId}/medications`, {
      method: 'POST',
      body: JSON.stringify(toMedicationInput(draft)),
    })
    return fromApiMedication(medication)
  },

  async updateMedication(id: string, draft: MedicationDraft) {
    const medication = await request<ApiMedication>(`/medications/${id}`, {
      method: 'PUT',
      body: JSON.stringify(toMedicationInput(draft)),
    })
    return fromApiMedication(medication)
  },

  listDoses(childId: string, query: DoseQuery) {
    const params = new URLSearchParams({ from: query.from, to: query.to })
    if (query.status) params.set('status', query.status)
    if (query.q) params.set('q', query.q)
    return request<DoseLog[]>(`/children/${childId}/doses?${params.toString()}`)
  },

  confirmDose(id: string) {
    return request<ConfirmDoseResult>(`/doses/${id}/confirm`, { method: 'POST' })
  },

  getStars(childId: string) {
    return request<Stars>(`/children/${childId}/stars`)
  },

  switchToKids(childId: string) {
    return request<{ mode: 'child'; childId: string; session: KidsSession }>('/session/mode', {
      method: 'POST',
      body: JSON.stringify({ mode: 'child', childId }),
    })
  },

  switchToParent(pin: string) {
    return request<{ mode: 'parent' }>('/session/mode', {
      method: 'POST',
      skipAuthRedirect: true,
      body: JSON.stringify({ mode: 'parent', pin }),
    })
  },

  setPin(currentPassword: string, pin: string) {
    return request<void>('/me/pin', {
      method: 'PUT',
      skipAuthRedirect: true,
      body: JSON.stringify({ currentPassword, pin }),
    })
  },

  getKidsState() {
    return request<KidsState>('/kids/state')
  },

  startGame(game: GameId) {
    return request<{ starBalance: number }>(`/kids/games/${game}/start`, { method: 'POST' })
  },

  getKidsSettings(childId: string) {
    return request<KidsSettings>(`/children/${childId}/kids-settings`)
  },

  updateKidsSettings(childId: string, input: KidsSettings) {
    return request<KidsSettings>(`/children/${childId}/kids-settings`, {
      method: 'PUT',
      body: JSON.stringify(input),
    })
  },

  endPlaySession(childId: string) {
    return request<void>(`/children/${childId}/play-sessions/current/end`, { method: 'POST' })
  },

  clearHistory(childId: string, password: string) {
    return request<{ deleted: number }>(`/children/${childId}/history/clear`, {
      method: 'POST',
      skipAuthRedirect: true,
      body: JSON.stringify({ password }),
    })
  },

  deleteAccount(password: string) {
    return request<void>('/me', {
      method: 'DELETE',
      skipAuthRedirect: true,
      body: JSON.stringify({ password }),
    })
  },

  updateChild(childId: string, input: { nickname: string; birthYear: number | null }) {
    return request<Child>(`/children/${childId}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    })
  },
}
