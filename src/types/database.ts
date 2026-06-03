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
          type: 'reminder' | 'budget_alert' | 'recurring' | 'system' | 'ai_insight'
          is_read: boolean
          action_url: string | null
          metadata: Json | null
          created_at: string
        }
      }
    }
  }
}
