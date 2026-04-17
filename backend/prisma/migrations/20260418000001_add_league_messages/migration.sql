-- CreateTable
CREATE TABLE "league_messages" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "private_league_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "league_messages_private_league_id_fkey" FOREIGN KEY ("private_league_id") REFERENCES "private_leagues" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "league_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
