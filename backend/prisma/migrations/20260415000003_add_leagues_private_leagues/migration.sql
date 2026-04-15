-- CreateTable: leagues
CREATE TABLE IF NOT EXISTS "leagues" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "logo_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "leagues_external_id_key" ON "leagues"("external_id");

-- Add league columns to players
ALTER TABLE "players" ADD COLUMN "league_id" INTEGER REFERENCES "leagues"("id");
ALTER TABLE "players" ADD COLUMN "league_external_id" TEXT;

-- CreateTable: private_leagues
CREATE TABLE IF NOT EXISTS "private_leagues" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "max_members" INTEGER NOT NULL DEFAULT 20,
    "league_filter" TEXT,
    "allow_mixed" BOOLEAN NOT NULL DEFAULT true,
    "season_id" INTEGER,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "private_leagues_code_key" ON "private_leagues"("code");

-- CreateTable: private_league_members
CREATE TABLE IF NOT EXISTS "private_league_members" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "private_league_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "team_id" TEXT,
    "joined_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "private_league_members_private_league_id_fkey" FOREIGN KEY ("private_league_id") REFERENCES "private_leagues" ("id") ON DELETE CASCADE,
    CONSTRAINT "private_league_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "private_league_members_private_league_id_user_id_key"
    ON "private_league_members"("private_league_id", "user_id");

-- Seed popular leagues
INSERT OR IGNORE INTO "leagues" ("name", "country", "external_id", "is_active") VALUES
    ('Eredivisie', 'Netherlands', '88', true),
    ('Premier League', 'England', '39', true),
    ('La Liga', 'Spain', '140', true),
    ('Bundesliga', 'Germany', '78', true),
    ('Serie A', 'Italy', '135', true),
    ('Ligue 1', 'France', '61', true),
    ('Champions League', 'Europe', '2', true),
    ('Europa League', 'Europe', '3', true);
