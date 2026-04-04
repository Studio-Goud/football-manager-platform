-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "balance_credits" DECIMAL NOT NULL DEFAULT 0,
    "balance_pending" DECIMAL NOT NULL DEFAULT 0,
    "tier" TEXT NOT NULL DEFAULT 'BRONZE',
    "kyc_status" TEXT NOT NULL DEFAULT 'PENDING',
    "kyc_level" INTEGER NOT NULL DEFAULT 0,
    "is_admin" BOOLEAN NOT NULL DEFAULT false,
    "is_suspended" BOOLEAN NOT NULL DEFAULT false,
    "date_of_birth" DATETIME,
    "country" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "last_active" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "seasons" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "competition" TEXT NOT NULL,
    "start_date" DATETIME NOT NULL,
    "end_date" DATETIME NOT NULL,
    "entry_fee_min" DECIMAL NOT NULL,
    "entry_fee_max" DECIMAL NOT NULL,
    "total_pot" DECIMAL NOT NULL DEFAULT 0,
    "platform_fee_pct" DECIMAL NOT NULL DEFAULT 20,
    "status" TEXT NOT NULL DEFAULT 'UPCOMING',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "gameweeks" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "season_id" INTEGER NOT NULL,
    "number" INTEGER NOT NULL,
    "deadline" DATETIME NOT NULL,
    "start_date" DATETIME NOT NULL,
    "end_date" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UPCOMING',
    CONSTRAINT "gameweeks_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "seasons" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "players" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "external_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "club" TEXT NOT NULL,
    "club_id" INTEGER NOT NULL,
    "position" TEXT NOT NULL,
    "nationality" TEXT,
    "photo_url" TEXT,
    "price" DECIMAL NOT NULL DEFAULT 5,
    "form" DECIMAL NOT NULL DEFAULT 5,
    "total_points" DECIMAL NOT NULL DEFAULT 0,
    "availability" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "injury_return" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "teams" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "season_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "formation" TEXT NOT NULL DEFAULT '4-4-2',
    "captain_player_id" INTEGER,
    "vice_captain_player_id" INTEGER,
    "total_points" DECIMAL NOT NULL DEFAULT 0,
    "entry_fee" DECIMAL NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "teams_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "teams_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "seasons" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "team_players" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "team_id" TEXT NOT NULL,
    "player_id" INTEGER NOT NULL,
    "slot_position" TEXT NOT NULL,
    "is_captain" BOOLEAN NOT NULL DEFAULT false,
    "is_vice_captain" BOOLEAN NOT NULL DEFAULT false,
    "purchase_price" DECIMAL NOT NULL,
    "added_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "team_players_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "team_players_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "team_gameweeks" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "team_id" TEXT NOT NULL,
    "gameweek_id" INTEGER NOT NULL,
    "points" DECIMAL NOT NULL DEFAULT 0,
    "rank" INTEGER,
    "prize_amount" DECIMAL NOT NULL DEFAULT 0,
    CONSTRAINT "team_gameweeks_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "team_gameweeks_gameweek_id_fkey" FOREIGN KEY ("gameweek_id") REFERENCES "gameweeks" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "matches" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "external_id" TEXT NOT NULL,
    "gameweek_id" INTEGER NOT NULL,
    "home_team" TEXT NOT NULL,
    "home_team_id" INTEGER NOT NULL,
    "away_team" TEXT NOT NULL,
    "away_team_id" INTEGER NOT NULL,
    "home_score" INTEGER,
    "away_score" INTEGER,
    "kickoff" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "minute" INTEGER,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "matches_gameweek_id_fkey" FOREIGN KEY ("gameweek_id") REFERENCES "gameweeks" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "match_events" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "match_id" INTEGER NOT NULL,
    "player_id" INTEGER,
    "event_type" TEXT NOT NULL,
    "minute" INTEGER NOT NULL,
    "points_awarded" DECIMAL NOT NULL,
    "detail" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "match_events_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "match_performances" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "match_id" INTEGER NOT NULL,
    "player_id" INTEGER NOT NULL,
    "minutes_played" INTEGER NOT NULL DEFAULT 0,
    "goals" INTEGER NOT NULL DEFAULT 0,
    "assists" INTEGER NOT NULL DEFAULT 0,
    "clean_sheet" BOOLEAN NOT NULL DEFAULT false,
    "yellow_cards" INTEGER NOT NULL DEFAULT 0,
    "red_cards" INTEGER NOT NULL DEFAULT 0,
    "own_goals" INTEGER NOT NULL DEFAULT 0,
    "saves" INTEGER NOT NULL DEFAULT 0,
    "penalty_saved" BOOLEAN NOT NULL DEFAULT false,
    "penalty_missed" BOOLEAN NOT NULL DEFAULT false,
    "rating" DECIMAL,
    "total_points" DECIMAL NOT NULL DEFAULT 0,
    CONSTRAINT "match_performances_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "match_performances_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "credits_amount" DECIMAL NOT NULL,
    "reference" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "description" TEXT,
    "metadata" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "marketplace_listings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "seller_id" TEXT NOT NULL,
    "player_id" INTEGER NOT NULL,
    "price" DECIMAL NOT NULL,
    "listing_type" TEXT NOT NULL,
    "min_bid" DECIMAL,
    "current_bid" DECIMAL,
    "current_bidder_id" TEXT,
    "expires_at" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "marketplace_listings_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "marketplace_listings_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "marketplace_bids" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "listing_id" TEXT NOT NULL,
    "bidder_id" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "marketplace_bids_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "marketplace_listings" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "marketplace_bids_bidder_id_fkey" FOREIGN KEY ("bidder_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "player_price_history" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "player_id" INTEGER NOT NULL,
    "price" DECIMAL NOT NULL,
    "recorded_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "player_price_history_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "user_powerups" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" TEXT NOT NULL,
    "powerup_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "gameweek_id" INTEGER,
    "purchased_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "used_at" DATETIME,
    CONSTRAINT "user_powerups_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "expires_at" DATETIME NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "achievements" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "points_reward" INTEGER NOT NULL DEFAULT 0,
    "credits_reward" DECIMAL NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "user_achievements" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" TEXT NOT NULL,
    "achievement_id" INTEGER NOT NULL,
    "earned_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_achievements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "responsible_gaming" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" TEXT NOT NULL,
    "daily_limit" DECIMAL,
    "weekly_limit" DECIMAL,
    "monthly_limit" DECIMAL,
    "session_limit_minutes" INTEGER,
    "self_excluded" BOOLEAN NOT NULL DEFAULT false,
    "excluded_until" DATETIME,
    CONSTRAINT "responsible_gaming_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "players_external_id_key" ON "players"("external_id");

-- CreateIndex
CREATE UNIQUE INDEX "team_gameweeks_team_id_gameweek_id_key" ON "team_gameweeks"("team_id", "gameweek_id");

-- CreateIndex
CREATE UNIQUE INDEX "matches_external_id_key" ON "matches"("external_id");

-- CreateIndex
CREATE UNIQUE INDEX "match_performances_match_id_player_id_key" ON "match_performances"("match_id", "player_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_token_key" ON "user_sessions"("token");

-- CreateIndex
CREATE UNIQUE INDEX "achievements_code_key" ON "achievements"("code");

-- CreateIndex
CREATE UNIQUE INDEX "responsible_gaming_user_id_key" ON "responsible_gaming"("user_id");
