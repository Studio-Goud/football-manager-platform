import { UserTier, PowerupType, PackType } from '@/types'

// ─── Scoring System ────────────────────────────────────────────────────────────

export const SCORING_SYSTEM = {
  // Attacking
  goal_forward: 6,
  goal_midfielder: 5,
  goal_defender: 6,
  goal_goalkeeper: 6,
  assist: 3,
  penalty_won: 2,
  penalty_missed: -2,

  // Clean sheets (per 90 min of play)
  clean_sheet_goalkeeper: 6,
  clean_sheet_defender: 4,
  clean_sheet_midfielder: 1,

  // Saves (per 3 saves)
  saves_3: 1,

  // Bonus points system (top 3 players per match)
  bonus_3: 3,
  bonus_2: 2,
  bonus_1: 1,

  // Discipline
  yellow_card: -1,
  red_card: -3,
  own_goal: -2,

  // Appearance
  played_60_plus: 2,
  played_under_60: 1,

  // Captain: all points doubled
  captain_multiplier: 2,
} as const

export type ScoringKey = keyof typeof SCORING_SYSTEM

// ─── Power-up Configuration ────────────────────────────────────────────────────

export const POWERUP_CONFIG: Record<
  PowerupType,
  {
    name: string
    description: string
    cost: number
    max_per_season: number
    icon: string
    color: string
  }
> = {
  double_points: {
    name: 'Dubbele Punten',
    description: 'Verdubbelt alle punten voor één speelronde. Ideaal voor thuiswedstrijden.',
    cost: 5,
    max_per_season: 3,
    icon: '✖️2',
    color: '#FFD700',
  },
  negative_shield: {
    name: 'Negatief Schild',
    description: 'Voorkomt negatieve punten voor alle spelers in één wedstrijd.',
    cost: 3,
    max_per_season: 5,
    icon: '🛡️',
    color: '#3B82F6',
  },
  streak_boost: {
    name: 'Streak Boost',
    description: '1.5x puntenvermenigvuldiger als je 3+ opeenvolgende goede speelrondes hebt.',
    cost: 8,
    max_per_season: 2,
    icon: '🔥',
    color: '#EF4444',
  },
  hot_transfer: {
    name: 'Hot Transfer',
    description: 'Gratis transfer buiten het transferwindow. Gebruik dit voor noodtransfers.',
    cost: 2,
    max_per_season: 4,
    icon: '🔄',
    color: '#00FF87',
  },
  captain_lock: {
    name: 'Aanvoerder Lock',
    description: 'Beschermt je aanvoerderspunten voor één wedstrijd, ook als hij geblesseerd uitvalt.',
    cost: 4,
    max_per_season: 4,
    icon: '🔒',
    color: '#9B59B6',
  },
}

// ─── Tier System ───────────────────────────────────────────────────────────────

export const TIER_CONFIG: Record<
  UserTier,
  {
    label: string
    min_invested: number
    max_invested: number
    color: string
    benefits: string[]
    transfer_fee_discount: number
  }
> = {
  bronze: {
    label: 'Bronze',
    min_invested: 0,
    max_invested: 499,
    color: '#CD7F32',
    benefits: ['Standaard features', 'Basis statistieken'],
    transfer_fee_discount: 0,
  },
  silver: {
    label: 'Silver',
    min_invested: 500,
    max_invested: 1499,
    color: '#C0C0C0',
    benefits: ['5% transferkorting', 'Uitgebreide statistieken', 'Priority support'],
    transfer_fee_discount: 0.05,
  },
  gold: {
    label: 'Gold',
    min_invested: 1500,
    max_invested: 3999,
    color: '#FFD700',
    benefits: ['10% transferkorting', 'Early pack access', 'Exclusieve statistieken', 'VIP support'],
    transfer_fee_discount: 0.10,
  },
  platinum: {
    label: 'Platinum',
    min_invested: 4000,
    max_invested: 9999,
    color: '#E5E4E2',
    benefits: ['15% transferkorting', 'Gratis maandelijks pack', 'AI-aanbevelingen', 'Persoonlijke manager'],
    transfer_fee_discount: 0.15,
  },
  rare: {
    label: 'Rare',
    min_invested: 10000,
    max_invested: Infinity,
    color: '#9B59B6',
    benefits: ['20% transferkorting', 'Wekelijks gratis pack', 'Vroeg toegang nieuwe features', 'VIP community'],
    transfer_fee_discount: 0.20,
  },
}

// ─── Pack Configuration ────────────────────────────────────────────────────────

export const PACK_CONFIG: Record<
  PackType,
  {
    name: string
    price: number
    players_count: number
    description: string
    guaranteed: string
    min_player_value: number
    color: string
  }
> = {
  basic: {
    name: 'Basic Pack',
    price: 3,
    players_count: 3,
    description: '3 willekeurige spelers. Minimaal 1 speelbare speler gegarandeerd.',
    guaranteed: '1x speelbaar',
    min_player_value: 2,
    color: '#CD7F32',
  },
  premium: {
    name: 'Premium Pack',
    price: 8,
    players_count: 5,
    description: '5 spelers waaronder minimaal 1 topspeler (>8 form). Betere kansen op sterren.',
    guaranteed: '1x form 8+',
    min_player_value: 5,
    color: '#C0C0C0',
  },
  elite: {
    name: 'Elite Pack',
    price: 20,
    players_count: 8,
    description: '8 spelers met gegarandeerde sterren. Kans op de meest gewilde spelers.',
    guaranteed: '2x form 9+',
    min_player_value: 8,
    color: '#FFD700',
  },
}

// ─── Season Configuration ──────────────────────────────────────────────────────

export const SEASON_CONFIG = {
  total_gameweeks: 38,
  budget_total: 100,
  max_players_from_club: 3,
  team_size: 15, // 11 starting + 4 bench
  starting_eleven: 11,
  bench_size: 4,
  free_transfers_per_week: 1,
  max_transfers_banked: 2,
  transfer_fee_credits: 4, // per extra transfer
  transfer_window_deadline: 'Friday 18:00', // before gameweek
  captain_switch_deadline_minute: 60,
}

// ─── Marketplace Configuration ─────────────────────────────────────────────────

export const MARKETPLACE_CONFIG = {
  transaction_fee_percentage: 0.05, // 5%
  min_listing_duration_hours: 1,
  max_listing_duration_hours: 168, // 7 days
  min_price: 0.5,
  auction_min_bid_increment: 0.1,
  max_active_listings_per_user: 10,
}

// ─── Coin Configuration ────────────────────────────────────────────────────────

export const FINANCIAL_CONFIG = {
  min_deposit: 0,
  max_deposit_daily: 10000,
  max_deposit_weekly: 50000,
  max_deposit_monthly: 100000,
  min_withdrawal: 0,
  max_withdrawal_daily: 0,
  withdrawal_processing_days: 0,
  early_withdrawal_penalty: 0,
}

// ─── Navigation ────────────────────────────────────────────────────────────────

export const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard' },
  { label: 'Mijn Team', href: '/team', icon: 'Users' },
  { label: 'Transfermarkt', href: '/marketplace', icon: 'ShoppingCart' },
  { label: 'Live Wedstrijden', href: '/live', icon: 'Radio' },
  { label: 'Ranglijst', href: '/leaderboard', icon: 'Trophy' },
  { label: 'Power-ups', href: '/powerups', icon: 'Zap' },
  { label: 'Profiel', href: '/profile', icon: 'User' },
] as const

// ─── Dutch Football Clubs ──────────────────────────────────────────────────────

export const PREMIER_LEAGUE_CLUBS = [
  'Arsenal', 'Aston Villa', 'Brentford', 'Brighton', 'Burnley',
  'Chelsea', 'Crystal Palace', 'Everton', 'Fulham', 'Liverpool',
  'Luton Town', 'Manchester City', 'Manchester United', 'Newcastle',
  'Nottingham Forest', 'Sheffield United', 'Tottenham', 'West Ham',
  'Wolves', 'Bournemouth',
]

// ─── Responsive Breakpoints ────────────────────────────────────────────────────

export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
}

// ─── Animation Durations ───────────────────────────────────────────────────────

export const ANIMATION = {
  fast: 0.15,
  normal: 0.3,
  slow: 0.5,
  verySlow: 1.0,
}

// ─── Local Storage Keys ────────────────────────────────────────────────────────

export const STORAGE_KEYS = {
  auth_token: 'fm_access_token',
  refresh_token: 'fm_refresh_token',
  user: 'fm_user',
  theme: 'fm_theme',
  notifications_read: 'fm_notifs_read',
  draft_team: 'fm_draft_team',
}

// ─── API Endpoints ─────────────────────────────────────────────────────────────

export const QUERY_KEYS = {
  user: ['user'],
  team: (seasonId: string) => ['team', seasonId],
  players: (params?: object) => ['players', params],
  player: (id: string) => ['player', id],
  matches: ['matches'],
  liveMatches: ['matches', 'live'],
  leaderboard: (seasonId: string) => ['leaderboard', seasonId],
  marketplace: (params?: object) => ['marketplace', params],
  transactions: ['transactions'],
  powerups: ['powerups'],
  notifications: ['notifications'],
  platformStats: ['admin', 'stats'],
}
