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
      recurring_templates: {
        Row: {
          id: string
          user_id: string
          wallet_id: string
          category_id: string | null
          name: string
          amount: number
          type: 'income' | 'expense' | 'transfer'
          frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
          next_due_date: string
          end_date: string | null
          is_active: boolean
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          wallet_id: string
          category_id?: string | null
          name: string
          amount: number
          type: 'income' | 'expense' | 'transfer'
          frequency?: 'daily' | 'weekly' | 'monthly' | 'yearly'
          next_due_date: string
          end_date?: string | null
          is_active?: boolean
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          wallet_id?: string
          category_id?: string | null
          name?: string
          amount?: number
          type?: 'income' | 'expense' | 'transfer'
          frequency?: 'daily' | 'weekly' | 'monthly' | 'yearly'
          next_due_date?: string
          end_date?: string | null
          is_active?: boolean
          notes?: string | null
          created_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          body: string
          type: 'reminder' | 'budget_alert' | 'recurring' | 'system' | 'ai_insight' | 'split_bill'
          is_read: boolean
          action_url: string | null
          metadata: Json | null
          created_at: string
        }
      }
      budgets: {
        Row: {
          id: string
          user_id: string
          category_id: string
          amount: number
          month: number
          year: number
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          category_id: string
          amount: number
          month: number
          year: number
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          category_id?: string
          amount?: number
          month?: number
          year?: number
          notes?: string | null
          created_at?: string
        }
      }
      last_bill_partners: {
        Row: {
          id: string
          user_id: string
          partner_user_id: string | null
          name: string
          avatar_url: string | null
          source: 'qr' | 'manual'
          last_used_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          partner_user_id?: string | null
          name: string
          avatar_url?: string | null
          source?: 'qr' | 'manual'
          last_used_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          partner_user_id?: string | null
          name?: string
          avatar_url?: string | null
          source?: 'qr' | 'manual'
          last_used_at?: string
          created_at?: string
          updated_at?: string
        }
      }
      split_bills: {
        Row: {
          id: string
          user_id: string
          transaction_id: string
          title: string
          amount: number
          split_method: 'equal' | 'custom'
          status: 'open' | 'settled'
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          transaction_id: string
          title: string
          amount: number
          split_method?: 'equal' | 'custom'
          status?: 'open' | 'settled'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          transaction_id?: string
          title?: string
          amount?: number
          split_method?: 'equal' | 'custom'
          status?: 'open' | 'settled'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      split_bill_shares: {
        Row: {
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
          created_at: string
        }
        Insert: {
          id?: string
          split_bill_id: string
          partner_id?: string | null
          partner_user_id?: string | null
          name: string
          avatar_url?: string | null
          amount: number
          status?: 'pending' | 'paid'
          paid_at?: string | null
          paid_transaction_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          split_bill_id?: string
          partner_id?: string | null
          partner_user_id?: string | null
          name?: string
          avatar_url?: string | null
          amount?: number
          status?: 'pending' | 'paid'
          paid_at?: string | null
          paid_transaction_id?: string | null
          created_at?: string
        }
      }
    }
  }
}
