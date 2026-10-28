import { createRoute, z } from '@hono/zod-openapi'
import { prisma } from '../db.js'
import { toMedicationDto } from '../lib/dto.js'
import { apiError, isUuid, notFound } from '../lib/errors.js'
import { createRouter } from '../lib/openapi.js'
import {
  errorResponse,
  MedicationInputSchema,
  MedicationSchema,
} from '../lib/schemas.js'
import { requireAuth, requireChildAccess } from '../middleware/auth.js'

export const medicationRoutes = createRouter()

type MedicationInput = z.infer<typeof MedicationInputSchema>

function normalizeInput(input: MedicationInput) {
  return {
    name: input.name.trim(),
    dose: input.dose.trim(),
    startDate: new Date(`${input.startDate}T00:00:00.000Z`),
    frequency: input.frequency,
    meal: input.meal,
    note: input.note?.trim() || null,
    times: input.frequency === 'AS_NEEDED' ? [] : [...new Set(input.times)].sort(),
    days: input.frequency === 'SOME_DAYS' ? [...new Set(input.days)] : [],
  }
}

const ChildParamsSchema = z.object({
  childId: z.uuid().openapi({ param: { name: 'childId', in: 'path' } }),
})

const MedicationParamsSchema = z.object({
  id: z.uuid().openapi({ param: { name: 'id', in: 'path' } }),
})

medicationRoutes.use('/children/:childId/medications', requireAuth, requireChildAccess)
medicationRoutes.use('/medications/*', requireAuth)

const listRoute = createRoute({
  method: 'get',
  path: '/children/{childId}/medications',
  tags: ['Medications'],
  summary: 'Daftar obat milik satu anak',
  request: { params: ChildParamsSchema },
  responses: {
    200: {
      content: { 'application/json': { schema: z.array(MedicationSchema) } },
      description: 'Daftar obat beserta jadwalnya.',
    },
    401: errorResponse('Belum masuk.'),
    404: errorResponse('Anak tidak ditemukan.'),
  },
})

medicationRoutes.openapi(listRoute, async (c) => {
  const child = c.get('child')
  const medications = await prisma.medication.findMany({
    where: { childId: child.id },
    include: { times: true, days: true },
    orderBy: { createdAt: 'asc' },
  })

  return c.json(medications.map(toMedicationDto), 200)
})

const createMedicationRoute = createRoute({
  method: 'post',
  path: '/children/{childId}/medications',
  tags: ['Medications'],
  summary: 'Tambah obat',
  request: {
    params: ChildParamsSchema,
    body: {
      required: true,
      content: { 'application/json': { schema: MedicationInputSchema } },
    },
  },
  responses: {
    201: {
      content: { 'application/json': { schema: MedicationSchema } },
      description: 'Obat berhasil ditambahkan.',
    },
    400: errorResponse('Data obat tidak valid.'),
    401: errorResponse('Belum masuk.'),
    404: errorResponse('Anak tidak ditemukan.'),
  },
})

medicationRoutes.openapi(createMedicationRoute, async (c) => {
  const child = c.get('child')
  const input = normalizeInput(c.req.valid('json'))

  const medication = await prisma.medication.create({
    data: {
      childId: child.id,
      name: input.name,
      dose: input.dose,
      startDate: input.startDate,
      frequency: input.frequency,
      meal: input.meal,
      note: input.note,
      times: { create: input.times.map((time) => ({ time })) },
      days: { create: input.days.map((day) => ({ day })) },
    },
    include: { times: true, days: true },
  })

  return c.json(toMedicationDto(medication), 201)
})

const updateMedicationRoute = createRoute({
  method: 'put',
  path: '/medications/{id}',
  tags: ['Medications'],
  summary: 'Ubah obat',
  request: {
    params: MedicationParamsSchema,
    body: {
      required: true,
      content: { 'application/json': { schema: MedicationInputSchema } },
    },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: MedicationSchema } },
      description: 'Obat berhasil diperbarui.',
    },
    400: errorResponse('Data obat tidak valid.'),
    401: errorResponse('Belum masuk.'),
    404: errorResponse('Obat tidak ditemukan.'),
  },
})

medicationRoutes.openapi(updateMedicationRoute, async (c) => {
  const user = c.get('user')
  const { id } = c.req.valid('param')
  if (!isUuid(id)) return notFound(c)

  const existing = await prisma.medication.findFirst({
    where: { id, child: { userId: user.id } },
    select: { id: true },
  })
  if (!existing) return notFound(c)

  const input = normalizeInput(c.req.valid('json'))
  const now = new Date()

  const updated = await prisma.$transaction(async (tx) => {
    await tx.medication.update({
      where: { id },
      data: {
        name: input.name,
        dose: input.dose,
        startDate: input.startDate,
        frequency: input.frequency,
        meal: input.meal,
        note: input.note,
      },
    })

    await tx.medicationTime.deleteMany({ where: { medicationId: id } })
    await tx.medicationDay.deleteMany({ where: { medicationId: id } })

    if (input.times.length > 0) {
      await tx.medicationTime.createMany({
        data: input.times.map((time) => ({ medicationId: id, time })),
      })
    }
    if (input.days.length > 0) {
      await tx.medicationDay.createMany({
        data: input.days.map((day) => ({ medicationId: id, day })),
      })
    }

    // Baris mendatang yang belum dikonfirmasi akan dibuat ulang dari jadwal baru.
    // Riwayat yang sudah lewat atau sudah dikonfirmasi tidak disentuh.
    await tx.doseLog.deleteMany({
      where: {
        medicationId: id,
        confirmedAt: null,
        scheduledAt: { gt: now },
      },
    })

    return tx.medication.findUniqueOrThrow({
      where: { id },
      include: { times: true, days: true },
    })
  })

  return c.json(toMedicationDto(updated), 200)
})
