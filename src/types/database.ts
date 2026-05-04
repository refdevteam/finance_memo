export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string | null
          avatar_url: string | null
          currency: string
          timezone: string
          onboarded: boolean
          fcm_token: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          avatar_url?: string | null
          currency?: string
          timezone?: string
          onboarded?: boolean
          fcm_token?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          avatar_url?: string | null
          currency?: string
          timezone?: string
          onboarded?: boolean
          fcm_token?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          user_id: string | null
          name: string
          icon: string
          color: string
          type: 'income' | 'expense' | 'transfer'
          is_default: boolean
          created_at: string
        }
      }
      wallets: {
        Row: {
          id: string
          user_id: string
          name: string
          type: 'cash' | 'bank' | 'ewallet' | 'investment' | 'other'
          balance: number
          currency: string
          color: string
          icon: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          wallet_id: string
          category_id: string | null
          receipt_id: string | null
          recurring_id: string | null
          amount: number
          type: 'income' | 'expense' | 'transfer'
          description: string | null
          notes: string | null
          transaction_date: string
          is_recurring: boolean
          tags: string[] | null
          created_at: string
          updated_at: string
        }
      }
    }
  }
}
