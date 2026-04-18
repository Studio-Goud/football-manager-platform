import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '@/lib/constants'
import api from '@/lib/api'
import { MarketplaceListing } from '@/types'
import toast from 'react-hot-toast'

interface MarketplaceFilters {
  position?: string
  min_price?: number
  max_price?: number
  max?: number
  club?: string
  search?: string
  listing_type?: string
  sort_by?: string
  page?: number
  per_page?: number
}

export function useMarketplace(filters?: MarketplaceFilters) {
  const queryClient = useQueryClient()

  const listingsQuery = useQuery({
    queryKey: QUERY_KEYS.marketplace(filters),
    queryFn: async () => {
      const res = await api.get('/marketplace', { params: filters })
      return res.data
    },
  })

  const buyMutation = useMutation({
    mutationFn: async (listingId: string) => {
      const res = await api.post(`/marketplace/${listingId}/buy`)
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace'] })
      queryClient.invalidateQueries({ queryKey: ['user'] })
      toast.success('Speler gekocht!')
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Aankoop mislukt')
    },
  })

  const bidMutation = useMutation({
    mutationFn: async ({ listingId, amount }: { listingId: string; amount: number }) => {
      const res = await api.post(`/marketplace/${listingId}/bid`, { amount })
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace'] })
      toast.success('Bod geplaatst!')
    },
    onError: () => toast.error('Bod mislukt'),
  })

  const createListingMutation = useMutation({
    mutationFn: async (data: { player_id: string; price: number; listing_type: 'fixed' | 'auction'; duration_hours: number }) => {
      const res = await api.post('/marketplace', data)
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace'] })
      toast.success('Listing aangemaakt!')
    },
    onError: () => toast.error('Listing aanmaken mislukt'),
  })

  const cancelListingMutation = useMutation({
    mutationFn: async (listingId: string) => {
      await api.delete(`/marketplace/${listingId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace'] })
      toast.success('Listing geannuleerd')
    },
  })

  const hotPlayersQuery = useQuery({
    queryKey: ['marketplace', 'hot'],
    queryFn: async () => {
      const res = await api.get('/marketplace/hot-players')
      return res.data.data as MarketplaceListing[]
    },
  })

  return {
    listings: listingsQuery.data?.data ?? [],
    total: listingsQuery.data?.total ?? 0,
    hotPlayers: hotPlayersQuery.data ?? [],
    isLoading: listingsQuery.isLoading,
    buy: buyMutation.mutate,
    bid: bidMutation.mutate,
    createListing: createListingMutation.mutate,
    cancelListing: cancelListingMutation.mutate,
    isBuying: buyMutation.isPending,
    isBidding: bidMutation.isPending,
    isCreating: createListingMutation.isPending,
  }
}
