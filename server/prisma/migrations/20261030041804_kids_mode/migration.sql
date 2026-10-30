-- CreateEnum
CREATE TYPE "Game" AS ENUM ('GARDEN', 'STYLE', 'MATCH_UP', 'COLOR_HUNT');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "StarReason" ADD VALUE 'WELCOME_BONUS';
ALTER TYPE "StarReason" ADD VALUE 'GAME_PLAY';

-- AlterTable
ALTER TABLE "star_transactions" ADD COLUMN     "game" "Game";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "pinFailedCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pinHash" TEXT,
ADD COLUMN     "pinLockedUntil" TIMESTAMPTZ(3);

-- CreateTable
CREATE TABLE "kids_mode_settings" (
    "childId" UUID NOT NULL,
    "sessionMinutes" INTEGER NOT NULL DEFAULT 15,
    "endReminder" BOOLEAN NOT NULL DEFAULT true,
    "reminderBeforeMinutes" INTEGER NOT NULL DEFAULT 2,

    CONSTRAINT "kids_mode_settings_pkey" PRIMARY KEY ("childId")
);

-- CreateTable
CREATE TABLE "play_sessions" (
    "id" UUID NOT NULL,
    "childId" UUID NOT NULL,
    "startedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMPTZ(3) NOT NULL,
    "endedAt" TIMESTAMPTZ(3),

    CONSTRAINT "play_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "play_sessions_childId_idx" ON "play_sessions"("childId");

-- AddForeignKey
ALTER TABLE "kids_mode_settings" ADD CONSTRAINT "kids_mode_settings_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "play_sessions" ADD CONSTRAINT "play_sessions_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;
