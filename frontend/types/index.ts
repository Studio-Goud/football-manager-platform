// ─── User & Auth ───────────────────────────────────────────────────────────────

export type UserTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'rare'
export type KYCStatus = 'pending' | 'submitted' | 'verified' | 'rejected' | 'not_started'
export type UserRole = 'user' | 'admin' | 'moderator'

export interface User {
  id: string
  email: string
  username: string
  balance_credits: number
  tier: UserTier
  kyc_status: KYCStatus
  role: UserRole
  avatar_url?: string
  created_at: string
  last_login: string
  seasons_played: number
  best_finish: number
  total_winnings: number
  total_invested: number
  is_suspended: boolean
}

export interface AuthTokens {
  access_token: string
  refresh_token: string
  expires_in: number
}

// ─── Player ────────────────────────────────────────────────────────────────────

export type PlayerPosition = 'GK' | 'DEF' | 'MID' | 'FWD'
export type PlayerAvailability = 'available' | 'injured' | 'suspended' | 'doubt'

export interface Player {
  id: string
  name: string
  first_name: string
  last_name: string
  club: string
  club_id: string
  club_logo?: string
  nationality: string
  position: PlayerPosition
  price: number
  form: number // 0-10
  availability: PlayerAvailability
  photo_url?: string
  total_points: number
  points_this_week: number
  goals: number
  assists: number
  clean_sheets: number
  yellow_cards: number
  red_cards: number
  saves?: number // GK only
  fixture_difficulty: number // 1-5
  upcoming_fixtures: UpcomingFixture[]
  form_history: number[] // last 6 gameweeks
  owned_by_percent: number
  price_change_week: number
  price_change?: number
  price_history?: Array<{ price: number; recorded_at: string }>
}

export interface UpcomingFixture {
  opponent: string
  home_away: 'H' | 'A'
  date: string
  difficulty: number // 1-5
}

// ─── Team ──────────────────────────────────────────────────────────────────────

export type Formation = '4-4-2' | '4-3-3' | '3-5-2' | '4-5-1' | '5-3-2' | '3-4-3'

export interface TeamPlayer {
  player_id: string
  player?: Player
  position: PlayerPosition
  is_captain: boolean
  is_vice_captain: boolean
  purchase_price: number
  slot: number // 1-15 (11 starting + 4 bench)
  is_benched: boolean
}

export interface Team {
  id: string
  user_id: string
  season_id: string
  name: string
  formation: Formation
  tactic_style?: string
  players: TeamPlayer[]
  captain_id: string
  vice_captain_id: string
  total_points: number
  gameweek_points: number
  budget_remaining: number
  budget_total: number
  transfers_remaining: number
  created_at: string
  updated_at: string
}

// ─── Match & Events ────────────────────────────────────────────────────────────

export type MatchStatus = 'scheduled' | 'live' | 'half_time' | 'finished' | 'postponed' | 'cancelled'
export type EventType = 'goal' | 'assist' | 'yellow_card' | 'red_card' | 'own_goal' | 'penalty_saved' | 'penalty_missed' | 'substitution' | 'clean_sheet'

export interface MatchEvent {
  id: string
  type: EventType
  player_id: string
  player_name: string
  team: string
  minute: number
  points_awarded: number
  is_my_player: boolean
}

export interface Match {
  id: string
  home_team: string
  away_team: string
  home_team_id: string
  away_team_id: string
  home_team_logo?: string
  away_team_logo?: string
  status: MatchStatus
  minute: number
  home_score: number
  away_score: number
  events: MatchEvent[]
  gameweek: number
  kickoff_time: string
  venue: string
  my_players_in_match: string[] // player IDs
  my_points_from_match: number
}

// ─── Marketplace ───────────────────────────────────────────────────────────────

export type ListingType = 'fixed' | 'auction'
export type ListingStatus = 'active' | 'sold' | 'expired' | 'cancelled'

export interface MarketplaceListing {
  id: string
  player: Player
  seller_id: string
  seller_username: string
  price: number
  current_bid?: number
  bid_count: number
  listing_type: ListingType
  status: ListingStatus
  expires_at: string
  created_at: string
  transaction_fee: number
  price_history?: PricePoint[]
}

export interface PricePoint {
  date: string
  price: number
}

export interface Bid {
  id: string
  listing_id: string
  bidder_id: string
  bidder_username: string
  amount: number
  created_at: string
}

// ─── Power-ups ─────────────────────────────────────────────────────────────────

export type PowerupType = 'double_points' | 'negative_shield' | 'streak_boost' | 'hot_transfer' | 'captain_lock'
export type PowerupStatus = 'available' | 'active' | 'used' | 'expired'

export interface Powerup {
  id: string
  type: PowerupType
  name: string
  description: string
  cost: number
  status: PowerupStatus
  active: boolean
  expires_at?: string
  applied_gameweek?: number
  purchased_at?: string
}

// ─── Transactions ──────────────────────────────────────────────────────────────

export type TransactionType =
  | 'deposit'
  | 'withdrawal'
  | 'coin_reward'
  | 'marketplace_sale'
  | 'marketplace_purchase'
  | 'powerup_purchase'
  | 'pack_purchase'
  | 'refund'

export interface Transaction {
  id: string
  user_id: string
  type: TransactionType
  amount: number
  balance_after: number
  created_at: string
  reference: string
  description: string
  status: 'pending' | 'completed' | 'failed' | 'refunded'
  metadata?: Record<string, unknown>
}

// ─── Leaderboard ───────────────────────────────────────────────────────────────

export interface LeaderboardEntry {
  rank: number
  previous_rank: number
  user: Pick<User, 'id' | 'username' | 'avatar_url' | 'tier'>
  team_name: string
  total_points: number
  gameweek_points: number
  prize: number
  is_current_user?: boolean
}

export interface Leaderboard {
  season_id: string
  gameweek: number
  entries: LeaderboardEntry[]
  total_participants: number
  updated_at: string
}

// ─── Season ────────────────────────────────────────────────────────────────────

export type SeasonStatus = 'upcoming' | 'active' | 'finished'

export interface Season {
  id: string
  name: string
  status: SeasonStatus
  current_gameweek: number
  total_gameweeks: number
  start_date: string
  end_date: string
  max_participants: number
  current_participants: number
  prize_distribution: PrizeDistribution[]
}

export interface PrizeDistribution {
  rank_from: number
  rank_to: number
  percentage: number
  prize_amount: number
}

// ─── Packs ─────────────────────────────────────────────────────────────────────

export type PackType = 'basic' | 'premium' | 'elite'

export interface Pack {
  type: PackType
  name: string
  price: number
  players_count: number
  description: string
  guaranteed_positions: string[]
  min_overall: number
  featured_player?: Player
}

// ─── Notifications ─────────────────────────────────────────────────────────────

export type NotificationType = 'match_event' | 'trade' | 'prize' | 'system' | 'transfer_window'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  read: boolean
  created_at: string
  action_url?: string
}

// ─── Admin ─────────────────────────────────────────────────────────────────────

export interface PlatformStats {
  total_users: number
  active_this_week: number
  total_deposits: number
  total_payouts: number
  platform_revenue: number
  pending_kyc: number
  suspicious_activity_count: number
}

export interface AdminUser extends User {
  total_deposits: number
  total_withdrawals: number
  account_balance: number
  ip_address?: string
  device_info?: string
}

// ─── API Response ──────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T
  message?: string
  success: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

export interface ApiError {
  message: string
  code: string
  field?: string
}
