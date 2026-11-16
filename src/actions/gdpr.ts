"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function exportUserData() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return { success: false, error: "Unauthorized" }
  
  try {
    const [
      profileRes,
      walletsRes,
      categoriesRes,
      transactionsRes,
      budgetsRes,
      recurringRes,
      remindersRes,
      notificationsRes,
      receiptsRes,
      walletTransfersRes,
      splitBillsRes,
      lastBillPartnersRes,
      aiInsightsRes
    ] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("wallets").select("*").eq("user_id", user.id),
      supabase.from("categories").select("*").eq("user_id", user.id),
      supabase.from("transactions").select("*").eq("user_id", user.id),
      supabase.from("budgets").select("*").eq("user_id", user.id),
      supabase.from("recurring_templates").select("*").eq("user_id", user.id),
      supabase.from("reminders").select("*").eq("user_id", user.id),
      supabase.from("notifications").select("*").eq("user_id", user.id),
      supabase.from("receipts").select("*").eq("user_id", user.id),
      // Tabel-tabel ini sebelumnya tidak ikut diekspor, padahal memuat data
      // pribadi yang sama (GDPR Pasal 20 — hak portabilitas).
      supabase.from("wallet_transfers").select("*").eq("user_id", user.id),
      supabase.from("split_bills").select("*").eq("user_id", user.id),
      supabase.from("last_bill_partners").select("*").eq("user_id", user.id),
      supabase.from("ai_insights").select("*").eq("user_id", user.id)
    ])
    
    const exportData = {
      exported_at: new Date().toISOString(),
      user_id: user.id,
      email: user.email,
      profile: profileRes.data || null,
      wallets: walletsRes.data || [],
      categories: categoriesRes.data || [],
      transactions: transactionsRes.data || [],
      budgets: budgetsRes.data || [],
      recurring_templates: recurringRes.data || [],
      reminders: remindersRes.data || [],
      notifications: notificationsRes.data || [],
      receipts: receiptsRes.data || [],
      wallet_transfers: walletTransfersRes.data || [],
      split_bills: splitBillsRes.data || [],
      last_bill_partners: lastBillPartnersRes.data || [],
      ai_insights: aiInsightsRes.data || []
    }
    
    return { success: true, data: exportData }
  } catch (error) {
    console.error("GDPR Export Error:", error)
    return { success: false, error: "Gagal mengekspor data" }
  }
}

export async function deleteUserAccount() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return { success: false, error: "Unauthorized" }
  
  try {
    // Call Edge Function to delete user from auth.users (cascades to all related data via RLS)
    const { data, error } = await supabase.functions.invoke("delete-user-account", {
      headers: {
        Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
      }
    })

    if (error) {
      console.error("Edge Function delete-user-account error:", error)
      throw new Error("Failed to delete user account")
    }

    if (!data?.success) {
      throw new Error(data?.error || "Failed to delete user account")
    }

    // Sign out user session
    await supabase.auth.signOut()
    
    revalidatePath("/")
    return { success: true }
  } catch (error) {
    console.error("GDPR Delete Error:", error)
    return { success: false, error: "Gagal menghapus data akun" }
  }
}
