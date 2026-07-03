'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface AIBudgetCategoryRecommendation {
  category_id: string
  category_name: string
  recommended_limit: number
  reason: string
}

export interface AISavingsRecommendation {
  institution: string
  type: 'bank' | 'investment'
  rate_pct: number
  description: string
  projection_1yr: number
  projection_3yr: number
}

export interface AIBudgetPlan {
  total_income?: number
  budgets: AIBudgetCategoryRecommendation[]
  savings_recommendations: AISavingsRecommendation[]
  analysis: {
    summary: string
    priority_action: string
    saving_tips: string
  }
}

export interface AIBudgetPlanResult {
  success: boolean
  data?: AIBudgetPlan
  error?: string
}

/**
 * Generate a new AI Budget Plan using Groq Llama 3.3.
 * Automatically loads user wallets, categories, budgets, and last 30 days transactions.
 */
export async function generateAIBudgetPlan(month: number, year: number): Promise<AIBudgetPlanResult> {
  const supabase = createClient()
  
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Kamu harus login terlebih dahulu.' }
    }

    const hasGroq = !!process.env.GROQ_API_KEY
    if (!hasGroq) {
      return { success: false, error: 'API Key Groq belum dikonfigurasi di server.' }
    }

    // 1. Fetch wallets, active categories, budgets, and transactions
    const startOfMonth = `${year}-${String(month).padStart(2, '0')}-01`
    const lastDay = new Date(year, month, 0).getDate()
    const endOfMonth = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    const [walletsRes, categoriesRes, budgetsRes, transactionsRes] = await Promise.all([
      supabase.from('wallets').select('*').eq('is_active', true),
      supabase.from('categories').select('*').eq('type', 'expense').or(`user_id.eq.${user.id},user_id.is.null`),
      supabase.from('budgets').select('*').eq('month', month).eq('year', year),
      supabase.from('transactions').select('*').gte('transaction_date', startOfMonth).lte('transaction_date', endOfMonth)
    ])

    if (walletsRes.error) throw walletsRes.error
    if (categoriesRes.error) throw categoriesRes.error
    if (budgetsRes.error) throw budgetsRes.error
    if (transactionsRes.error) throw transactionsRes.error

    const wallets = walletsRes.data || []
    const categories = categoriesRes.data || []
    const budgets = budgetsRes.data || []
    const transactions = transactionsRes.data || []

    // Calculate total balance across wallets
    const totalBalance = wallets.reduce((sum, w) => sum + Number(w.balance || 0), 0)

    // Calculate monthly income and expenses
    const totalIncome = transactions
      .filter(tx => tx.type === 'income')
      .reduce((sum, tx) => sum + Number(tx.amount || 0), 0)
    const totalExpense = transactions
      .filter(tx => tx.type === 'expense')
      .reduce((sum, tx) => sum + Number(tx.amount || 0), 0)

    // Calculate spent per category
    const categorySpentMap = new Map<string, number>()
    transactions
      .filter(tx => tx.type === 'expense')
      .forEach(tx => {
        if (tx.category_id) {
          const current = categorySpentMap.get(tx.category_id) || 0
          categorySpentMap.set(tx.category_id, current + Number(tx.amount || 0))
        }
      })

    // Map active budgets
    const categoryBudgetMap = new Map<string, number>()
    budgets.forEach(b => {
      categoryBudgetMap.set(b.category_id, Number(b.amount || 0))
    })

    // Construct prompt context
    const walletsStr = wallets.map(w => `- ${w.name} (${w.type}): Rp ${Number(w.balance).toLocaleString('id-ID')}`).join('\n')
    const categoriesStr = categories.map(c => `- ${c.name} (ID: ${c.id}) (Budget Saat Ini: Rp ${(categoryBudgetMap.get(c.id) || 0).toLocaleString('id-ID')}, Terpakai Bulan Ini: Rp ${(categorySpentMap.get(c.id) || 0).toLocaleString('id-ID')})`).join('\n')

    const prompt = `
      Kamu adalah Fimo Budget Advisor, asisten perencana keuangan AI pribadi yang sangat cerdas, realistis, dan berorientasi pada ketenangan pikiran (mental health) pengguna.
      Tugasmu adalah menganalisis kondisi keuangan pengguna saat ini dan menyusun rencana alokasi anggaran belanja bulanan beserta rekomendasi instrumen menabung atau investasi terbaik.

      Kondisi Keuangan Saat Ini:
      - Total Saldo Dompet: Rp ${totalBalance.toLocaleString('id-ID')}
      - Rincian Dompet:
      ${walletsStr || 'Belum ada dompet aktif.'}
      - Pemasukan Bulan Ini: Rp ${totalIncome.toLocaleString('id-ID')}
      - Pengeluaran Bulan Ini: Rp ${totalExpense.toLocaleString('id-ID')}
      
      Kategori Pengeluaran Pengguna & Status Budget:
      ${categoriesStr || 'Belum ada kategori aktif.'}

      Aturan Penyusunan Anggaran AI:
      1. Sediakan pembagian anggaran kategori belanja yang realistis. Jangan menyarankan batas anggaran total melebihi pemasukan bulanan! Sisakan minimal 20-30% dari total pemasukan sebagai target tabungan.
      2. Berikan rekomendasi batas anggaran untuk SETIAP kategori pengeluaran aktif yang terdaftar di atas. Gunakan ID kategori (category_id) yang benar agar sistem bisa mengidentifikasinya.
      3. Rekomendasikan instrumen tabungan/investasi yang cocok di Indonesia saat ini:
         - **Bank Jago** (Bunga default: 3.75% p.a., berikan analisis fitur Kantong Jago)
         - **Seabank** (Bunga default: 4.5% p.a. cair harian)
         - **Reksadana Pasar Uang / Bibit** (Return default: 5.5% p.a.)
         - **Surat Berharga Negara / SBN** (Return default: 6.2% p.a. aman dijamin negara)
         Hitung nilai proyeksi tabungan 1 tahun dan 3 tahun dengan asumsi pengguna menyisihkan sisa uang bulanan (pemasukan dikurangi total anggaran rekomendasi) ke instrumen tersebut.
         Rincikan keuntungannya secara dinamis.
      4. Hasil harus dikembalikan dalam format JSON murni tanpa pembungkus markdown block, dengan struktur berikut:
      {
        "budgets": [
          {
            "category_id": "id-kategori",
            "category_name": "Nama Kategori",
            "recommended_limit": 1500000,
            "reason": "Alasan penentuan budget untuk kategori ini..."
          }
        ],
        "savings_recommendations": [
          {
            "institution": "Bank Jago",
            "type": "bank",
            "rate_pct": 3.75,
            "description": "Menawarkan bunga 3.75% p.a. yang cocok untuk memisah pos dana darurat menggunakan fitur Kantong agar tidak bercampur dengan pengeluaran harian.",
            "projection_1yr": 12243750,
            "projection_3yr": 38167300
          }
        ],
        "analysis": {
          "summary": "Analisis singkat kondisi aliran kas pengguna saat ini (1-2 kalimat).",
          "priority_action": "Tindakan utama paling mendesak yang harus dilakukan pengguna demi kesehatan keuangan mereka (1 kalimat).",
          "saving_tips": "Tip edukasi menabung yang ramah dan memotivasi kesehatan mental pengguna (1-2 kalimat)."
        }
      }
    `

    // Call Groq API
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      }),
    })

    if (!response.ok) {
      const errData = await response.json()
      throw new Error(errData.error?.message || `Groq API returned status ${response.status}`)
    }

    const resJson = await response.json()
    const rawContent = resJson.choices[0]?.message?.content
    if (!rawContent) throw new Error("Groq API returned empty response")

    const parsedData = JSON.parse(rawContent) as AIBudgetPlan
    parsedData.total_income = totalIncome

    // Cache the generated plan in the database (expire in 7 days)
    const expireTime = new Date()
    expireTime.setDate(expireTime.getDate() + 7)

    // Delete existing cached plan if any
    await supabase
      .from('ai_insights')
      .delete()
      .eq('user_id', user.id)
      .eq('type', 'ai_budget_plan')

    // Insert new plan cache
    await supabase
      .from('ai_insights')
      .insert({
        user_id: user.id,
        type: 'ai_budget_plan',
        content: JSON.stringify(parsedData),
        expire_at: expireTime.toISOString()
      })

    revalidatePath('/dashboard/ai-budget-planner')
    return { success: true, data: parsedData }

  } catch (err) {
    console.error('AI Budget Planner system error:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Terjadi kesalahan sistem internal.'
    }
  }
}

/**
 * Fetch cached AI Budget Plan from the database.
 */
export async function getCachedAIBudgetPlan(): Promise<AIBudgetPlanResult> {
  const supabase = createClient()
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const { data: cached, error } = await supabase
      .from('ai_insights')
      .select('content, expire_at')
      .eq('user_id', user.id)
      .eq('type', 'ai_budget_plan')
      .gt('expire_at', new Date().toISOString())
      .maybeSingle()

    if (error) throw error
    if (!cached) return { success: false }

    const parsedContent = JSON.parse(cached.content) as AIBudgetPlan
    return { success: true, data: parsedContent }

  } catch (err) {
    console.error('Error fetching cached AI budget plan:', err)
    return { success: false, error: 'Gagal mengambil rencana budget AI ter-cache.' }
  }
}

/**
 * Delete cached AI Budget Plan to force regeneration.
 */
export async function deleteAIBudgetPlan(): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const { error } = await supabase
      .from('ai_insights')
      .delete()
      .eq('user_id', user.id)
      .eq('type', 'ai_budget_plan')

    if (error) throw error

    revalidatePath('/dashboard/ai-budget-planner')
    return { success: true }

  } catch (err) {
    console.error('Error deleting cached AI budget plan:', err)
    return { success: false, error: 'Gagal menghapus rencana budget AI.' }
  }
}
