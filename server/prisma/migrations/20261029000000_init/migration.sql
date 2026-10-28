-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Frequency" AS ENUM ('EVERY_DAY', 'SOME_DAYS', 'AS_NEEDED');

-- CreateEnum
CREATE TYPE "MealTiming" AS ENUM ('BEFORE_MEAL', 'AFTER_MEAL', 'ANYTIME');

-- CreateEnum
CREATE TYPE "Weekday" AS ENUM ('MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN');

-- CreateEnum
CREATE TYPE "StarReason" AS ENUM ('DOSE_CONFIRMED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "timezone" VARCHAR(64) NOT NULL DEFAULT 'Asia/Jakarta',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "children" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "nickname" VARCHAR(40),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "children_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medications" (
    "id" UUID NOT NULL,
    "childId" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "dose" VARCHAR(40) NOT NULL,
    "startDate" DATE NOT NULL,
    "frequency" "Frequency" NOT NULL,
    "meal" "MealTiming" NOT NULL DEFAULT 'ANYTIME',
    "note" VARCHAR(1000),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "medications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medication_times" (
    "medicationId" UUID NOT NULL,
    "time" VARCHAR(5) NOT NULL,

    CONSTRAINT "medication_times_pkey" PRIMARY KEY ("medicationId","time")
);

-- CreateTable
CREATE TABLE "medication_days" (
    "medicationId" UUID NOT NULL,
    "day" "Weekday" NOT NULL,

    CONSTRAINT "medication_days_pkey" PRIMARY KEY ("medicationId","day")
);

-- CreateTable
CREATE TABLE "dose_logs" (
    "id" UUID NOT NULL,
    "medicationId" UUID NOT NULL,
    "medicationName" VARCHAR(80) NOT NULL,
    "dose" VARCHAR(40) NOT NULL,
    "scheduledAt" TIMESTAMPTZ(3) NOT NULL,
    "confirmedAt" TIMESTAMPTZ(3),
    "confirmedById" UUID,

    CONSTRAINT "dose_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "star_transactions" (
    "id" UUID NOT NULL,
    "childId" UUID NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" "StarReason" NOT NULL,
    "doseLogId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "star_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "children_userId_idx" ON "children"("userId");

-- CreateIndex
CREATE INDEX "medications_childId_idx" ON "medications"("childId");

-- CreateIndex
CREATE INDEX "dose_logs_scheduledAt_idx" ON "dose_logs"("scheduledAt");

-- CreateIndex
CREATE UNIQUE INDEX "dose_logs_medicationId_scheduledAt_key" ON "dose_logs"("medicationId", "scheduledAt");

-- CreateIndex
CREATE UNIQUE INDEX "star_transactions_doseLogId_key" ON "star_transactions"("doseLogId");

-- CreateIndex
CREATE INDEX "star_transactions_childId_idx" ON "star_transactions"("childId");

-- AddForeignKey
ALTER TABLE "children" ADD CONSTRAINT "children_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medications" ADD CONSTRAINT "medications_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_times" ADD CONSTRAINT "medication_times_medicationId_fkey" FOREIGN KEY ("medicationId") REFERENCES "medications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_days" ADD CONSTRAINT "medication_days_medicationId_fkey" FOREIGN KEY ("medicationId") REFERENCES "medications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dose_logs" ADD CONSTRAINT "dose_logs_medicationId_fkey" FOREIGN KEY ("medicationId") REFERENCES "medications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dose_logs" ADD CONSTRAINT "dose_logs_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "star_transactions" ADD CONSTRAINT "star_transactions_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "star_transactions" ADD CONSTRAINT "star_transactions_doseLogId_fkey" FOREIGN KEY ("doseLogId") REFERENCES "dose_logs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Constraint tambahan (Prisma belum mendukung CHECK langsung di schema.prisma)
ALTER TABLE "medication_times"
  ADD CONSTRAINT "medication_times_time_format"
  CHECK ("time" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');

ALTER TABLE "star_transactions"
  ADD CONSTRAINT "star_transactions_amount_nonzero" CHECK ("amount" <> 0);

ALTER TABLE "star_transactions"
  ADD CONSTRAINT "star_transactions_dose_reward_is_one"
  CHECK ("reason" <> 'DOSE_CONFIRMED' OR "amount" = 1);
