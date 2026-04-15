-- Add duels table
CREATE TABLE "duels" (
  "id"                 TEXT NOT NULL PRIMARY KEY,
  "challenger_id"      TEXT NOT NULL,
  "opponent_id"        TEXT NOT NULL,
  "challenger_team_id" TEXT NOT NULL,
  "opponent_team_id"   TEXT NOT NULL,
  "gameweek_id"        INTEGER NOT NULL,
  "stake"              DECIMAL NOT NULL DEFAULT 0,
  "status"             TEXT NOT NULL DEFAULT 'PENDING',
  "challenger_tactic"  TEXT NOT NULL DEFAULT 'BALANCED',
  "opponent_tactic"    TEXT NOT NULL DEFAULT 'BALANCED',
  "challenger_points"  DECIMAL NOT NULL DEFAULT 0,
  "opponent_points"    DECIMAL NOT NULL DEFAULT 0,
  "winner_id"          TEXT,
  "message"            TEXT,
  "created_at"         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "duels_challenger_id_fkey" FOREIGN KEY ("challenger_id") REFERENCES "users" ("id"),
  CONSTRAINT "duels_opponent_id_fkey"   FOREIGN KEY ("opponent_id")   REFERENCES "users" ("id"),
  CONSTRAINT "duels_gameweek_id_fkey"   FOREIGN KEY ("gameweek_id")   REFERENCES "gameweeks" ("id")
);
