"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function getWallets() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error("Unauthorized")

  const { data, error } = await supabase
    .from("wallets")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) throw error
  return data
}

export async function createWallet(formData: {
  name: string
  type: string
  balance: number
  color?: string
  is_event_wallet?: boolean
  event_metadata?: Record<string, unknown>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error("Unauthorized")

  const { error } = await supabase
    .from("wallets")
    .insert({
      user_id: user.id,
      name: formData.name,
      type: formData.type,
      balance: formData.balance,
      color: formData.color || "#10b981",
      is_event_wallet: formData.is_event_wallet || false,
      event_metadata: formData.event_metadata || null,
    })

  if (error) throw error
  
  revalidatePath("/dashboard/wallets")
  revalidatePath("/dashboard")
}

export async function updateWalletBalance(id: string, balance: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error("Unauthorized")

  // Server-side rate limit: 5x per day per user (stored in profiles table)
  const today = new Date().toISOString().split("T")[0]

  const { data: profile } = await supabase
    .from("profiles")
    .select("wallet_edit_count, wallet_edit_date")
    .eq("id", user.id)
    .single()

  const storedDate = profile?.wallet_edit_date
  const storedCount = profile?.wallet_edit_count ?? 0

  // Reset counter jika tanggal berbeda (hari baru)
  const currentCount = storedDate === today ? storedCount : 0

  if (currentCount >= 5) {
    throw new Error("Batas edit saldo (5x per hari) telah tercapai.")
  }

  const { error } = await supabase
    .from("wallets")
    .update({ balance })
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) throw error

  // Increment rate limit counter di database (server-side)
  const { error: updateErr } = await supabase
    .from("profiles")
    .update({
      wallet_edit_count: currentCount + 1,
      wallet_edit_date: today,
    })
    .eq("id", user.id)

  if (updateErr) {
    console.error("Failed to update rate limit counter:", updateErr)
  }

  revalidatePath("/dashboard/wallets")
  revalidatePath("/dashboard")
}

export async function deleteWallet(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error("Unauthorized")

  const { error } = await supabase
    .from("wallets")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) throw error

  revalidatePath("/dashboard/wallets")
  revalidatePath("/dashboard")
}
