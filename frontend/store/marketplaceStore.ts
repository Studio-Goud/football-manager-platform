import { create } from 'zustand'
import { MarketplaceListing, Bid } from '@/types'
import { marketplaceApi } from '@/lib/api'

interface MarketplaceFilters {
  position?: string
  min_price?: number
  max_price?: number
  listing_type?: 'fixed' | 'auction' | 'all'
  search?: string
  sort?: string
  page: number
}

interface MarketplaceState {
  listings: MarketplaceListing[]
  myListings: MarketplaceListing[]
  selectedListing: MarketplaceListing | null
  bids: Bid[]
  isLoading: boolean
  isLoadingMyListings: boolean
  error: string | null
  filters: MarketplaceFilters
  totalListings: number
  totalPages: number

  // Actions
  loadListings: (filters?: Partial<MarketplaceFilters>) => Promise<void>
  loadMyListings: () => Promise<void>
  selectListing: (listing: MarketplaceListing | null) => void
  buyListing: (listingId: string) => Promise<void>
  placeBid: (listingId: string, amount: number) => Promise<void>
  createListing: (data: {
    player_id: string
    price: number
    listing_type: 'fixed' | 'auction'
    duration_hours: number
  }) => Promise<void>
  cancelListing: (listingId: string) => Promise<void>
  updateFilters: (filters: Partial<MarketplaceFilters>) => void
  clearFilters: () => void
  updateListingFromSocket: (listing: Partial<MarketplaceListing> & { id: string }) => void
  clearError: () => void
}

const defaultFilters: MarketplaceFilters = {
  listing_type: 'all',
  sort: 'expires_soon',
  page: 1,
}

export const useMarketplaceStore = create<MarketplaceState>((set, get) => ({
  listings: [],
  myListings: [],
  selectedListing: null,
  bids: [],
  isLoading: false,
  isLoadingMyListings: false,
  error: null,
  filters: defaultFilters,
  totalListings: 0,
  totalPages: 1,

  loadListings: async (filters?: Partial<MarketplaceFilters>) => {
    const currentFilters = { ...get().filters, ...filters }
    set({ isLoading: true, error: null, filters: currentFilters })

    try {
      const params = {
        ...currentFilters,
        listing_type: currentFilters.listing_type === 'all' ? undefined : currentFilters.listing_type,
      }
      const response = await marketplaceApi.getListings(params)
      const { data, total, total_pages } = response.data

      set({
        listings: data,
        totalListings: total,
        totalPages: total_pages,
        isLoading: false,
      })
    } catch {
      set({ isLoading: false, error: 'Laden van listings mislukt' })
    }
  },

  loadMyListings: async () => {
    set({ isLoadingMyListings: true })
    try {
      const response = await marketplaceApi.getMyListings()
      set({ myListings: response.data.data, isLoadingMyListings: false })
    } catch {
      set({ isLoadingMyListings: false })
    }
  },

  selectListing: (listing: MarketplaceListing | null) => {
    set({ selectedListing: listing })
  },

  buyListing: async (listingId: string) => {
    set({ isLoading: true, error: null })
    try {
      await marketplaceApi.buyListing(listingId)

      set((state) => ({
        listings: state.listings.filter((l) => l.id !== listingId),
        myListings: state.myListings.filter((l) => l.id !== listingId),
        isLoading: false,
      }))
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Aankoop mislukt'
      set({ isLoading: false, error: message })
      throw error
    }
  },

  placeBid: async (listingId: string, amount: number) => {
    set({ isLoading: true, error: null })
    try {
      await marketplaceApi.placeBid(listingId, amount)

      set((state) => ({
        listings: state.listings.map((l) => {
          if (l.id === listingId) {
            return { ...l, current_bid: amount, bid_count: l.bid_count + 1 }
          }
          return l
        }),
        isLoading: false,
      }))
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Bod plaatsen mislukt'
      set({ isLoading: false, error: message })
      throw error
    }
  },

  createListing: async (data) => {
    set({ isLoading: true, error: null })
    try {
      const response = await marketplaceApi.createListing(data)
      const newListing = response.data.data

      set((state) => ({
        myListings: [newListing, ...state.myListings],
        isLoading: false,
      }))
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Listing aanmaken mislukt'
      set({ isLoading: false, error: message })
      throw error
    }
  },

  cancelListing: async (listingId: string) => {
    set({ isLoading: true, error: null })
    try {
      await marketplaceApi.cancelListing(listingId)

      set((state) => ({
        myListings: state.myListings.filter((l) => l.id !== listingId),
        listings: state.listings.filter((l) => l.id !== listingId),
        isLoading: false,
      }))
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Annuleren mislukt'
      set({ isLoading: false, error: message })
      throw error
    }
  },

  updateFilters: (filters: Partial<MarketplaceFilters>) => {
    set((state) => ({
      filters: { ...state.filters, ...filters, page: 1 },
    }))
  },

  clearFilters: () => {
    set({ filters: defaultFilters })
  },

  updateListingFromSocket: (listing) => {
    set((state) => ({
      listings: state.listings.map((l) =>
        l.id === listing.id ? { ...l, ...listing } : l
      ),
    }))
  },

  clearError: () => set({ error: null }),
}))
