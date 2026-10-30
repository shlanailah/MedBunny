-- Constraint tambahan Tahap 2 (Prisma belum mendukung CHECK / partial unique index langsung).

ALTER TABLE "kids_mode_settings"
  ADD CONSTRAINT "kids_session_minutes_range" CHECK ("sessionMinutes" BETWEEN 5 AND 30);

-- Satu anak hanya boleh punya satu sesi bermain yang aktif
CREATE UNIQUE INDEX "play_sessions_one_active"
  ON "play_sessions" ("childId") WHERE "endedAt" IS NULL;

-- Kolom game hanya diisi untuk GAME_PLAY, dan satu kali main selalu tepat 1 bintang
ALTER TABLE "star_transactions"
  ADD CONSTRAINT "star_transactions_game_only_for_play" CHECK (("reason" = 'GAME_PLAY') = ("game" IS NOT NULL)),
  ADD CONSTRAINT "star_transactions_game_play_is_minus_one" CHECK ("reason" <> 'GAME_PLAY' OR "amount" = -1),
  ADD CONSTRAINT "star_transactions_welcome_positive" CHECK ("reason" <> 'WELCOME_BONUS' OR "amount" > 0);

-- Bintang sambutan hanya sekali per anak
CREATE UNIQUE INDEX "star_transactions_one_welcome_bonus"
  ON "star_transactions" ("childId") WHERE "reason" = 'WELCOME_BONUS';

-- Anak yang sudah terdaftar sebelum tahap 2 juga mendapat bintang sambutan
INSERT INTO "star_transactions" ("id", "childId", "amount", "reason", "createdAt")
SELECT gen_random_uuid(), "id", 3, 'WELCOME_BONUS', now() FROM "children";
