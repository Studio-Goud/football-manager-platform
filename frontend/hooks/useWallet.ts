import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { Transaction } from '@/types'
import { useAuthStore } from '@/store/authStore'
import { QUERY_KEYS, FINANCIAL_CONFIG } from '@/lib/constants'
import toast from 'react-hot-toast'

export function useWallet() {
  const queryClient = useQueryClient()
  const { updateBalance } = useAuthStore()

  const transactionsQuery = useQuery({
    queryKey: QUERY_KEYS.transactions,
    queryFn: async (): Promise<{ data: Transaction[]; total: number }> => {
      const res = await api.get('/payments/history')
      return res.data
    },
  })

  const depositMutation = useMutation({
    mutationFn: async (amountEur: number) => {
      if (amountEur < FINANCIAL_CONFIG.min_deposit) throw new Error(`Minimale storting €${FINANCIAL_CONFIG.min_deposit}`)
      const res = await api.post('/payments/deposit', { amount: amountEur })
      return res.data.data
    },
    onSuccess: (data) => {
      // data contains client_secret for Stripe
      toast.success('Betalingsverzoek aangemaakt')
      return data
    },
    onError: (err: Error) => toast.error(err.message ?? 'Storting mislukt'),
  })

  const confirmDepositMutation = useMutation({
    mutationFn: async (paymentIntentId: string) => {
      const res = await api.post('/payments/deposit/confirm', { payment_intent_id: paymentIntentId })
      return res.data.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.transactions })
      updateBalance(data.new_balance)
      toast.success(`€${data.amount} toegevoegd aan je account!`)
    },
  })

  const withdrawMutation = useMutation({
    mutationFn: async ({ amountCredits, bankAccount }: { amountCredits: number; bankAccount: string }) => {
      const res = await api.post('/payments/withdraw', { amount_credits: amountCredits, bank_account: bankAccount })
      return res.data.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.transactions })
      updateBalance(data.new_balance)
      toast.success(`Opname van €${data.amount_eur} is aangevraagd. Verwerking in ${FINANCIAL_CONFIG.withdrawal_processing_days} werkdagen.`)
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Opname mislukt')
    },
  })

  return {
    transactions: transactionsQuery.data?.data ?? [],
    totalTransactions: transactionsQuery.data?.total ?? 0,
    isLoading: transactionsQuery.isLoading,
    deposit: depositMutation.mutateAsync,
    confirmDeposit: confirmDepositMutation.mutate,
    withdraw: withdrawMutation.mutate,
    isDepositing: depositMutation.isPending,
    isWithdrawing: withdrawMutation.isPending,
  }
}
