export interface Partner {
  id: string
  name: string
  partner_user_id: string | null
  avatar_url: string | null
  source: 'qr' | 'manual'
  last_used_at: string
}

export interface ShareDraft {
  partner_id: string | null
  partner_user_id: string | null
  name: string
  avatar_url: string | null
}

export interface WalletOpt {
  id: string
  name: string
}

export interface CategoryOpt {
  id: string
  name: string
  type: string
}

export interface SplitShare {
  id: string
  split_bill_id: string
  partner_id: string | null
  partner_user_id: string | null
  name: string
  avatar_url: string | null
  amount: number
  status: 'pending' | 'paid'
  paid_at: string | null
  paid_transaction_id: string | null
}

export interface SplitBillWithShares {
  id: string
  title: string
  amount: number
  split_method: 'equal' | 'custom'
  status: 'open' | 'settled'
  notes: string | null
  created_at: string
  transaction_id: string
  split_bill_shares: SplitShare[]
}

export interface SplitPrefill {
  new: boolean
  amount?: number
  title?: string
  date?: string
  receipt_id?: string
  category_name?: string
}

/** Tagihan dari user lain yang berisi saya (via RPC bills_shared_with_me) */
export interface SharedBill {
  id: string
  title: string
  amount: number
  split_method: 'equal' | 'custom'
  status: 'open' | 'settled'
  notes: string | null
  created_at: string
  payer_id: string
  payer_name: string | null
  payer_avatar: string | null
  my_share_amount: number
  my_share_status: 'pending' | 'paid'
}
