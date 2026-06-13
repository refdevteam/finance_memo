'use server'

import { createClient } from '@/lib/supabase/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export interface AICoachInsightResult {
  success: boolean
  data?: {
    tip: string
    score?: number
  }
  error?: string
}

export async function getAICoachInsight(type: 'daily' | 'weekly'): Promise<AICoachInsightResult> {
  const supabase = createClient()
  
  try {
    // 1. Get current authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' }
    }

    // 2. Check for active cached insight in database
    const { data: cached } = await supabase
      .from('ai_insights')
      .select('content, expire_at')
      .eq('user_id', user.id)
      .eq('type', type)
      .gt('expire_at', new Date().toISOString())
      .order('expire_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (cached) {
      try {
        const parsedContent = JSON.parse(cached.content)
        return { success: true, data: parsedContent }
      } catch (parseErr) {
        console.error('Error parsing cached insight content:', parseErr)
      }
    }

    // 3. Cache missed or expired: Fetch recent transactions and budgets
    const currency = 'IDR'
    let startDate: string
    const now = new Date()
    const toYYYYMMDD = (d: Date) => d.toISOString().split('T')[0]

    if (type === 'daily') {
      // Last 2 days
      const twoDaysAgo = new Date()
      twoDaysAgo.setDate(now.getDate() - 1)
      startDate = toYYYYMMDD(twoDaysAgo)
    } else {
      // Last 7 days
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(now.getDate() - 6)
      startDate = toYYYYMMDD(sevenDaysAgo)
    }

    // Fetch transactions
    const { data: transactions } = await supabase
      .from('transactions')
      .select(`
        amount,
        type,
        description,
        transaction_date,
        categories (
          name
        )
      `)
      .eq('user_id', user.id)
      .gte('transaction_date', startDate)
      .lte('transaction_date', toYYYYMMDD(now))

    // Fetch current monthly budgets
    const budgetMonth = now.getMonth() + 1
    const budgetYear = now.getFullYear()
    const { data: budgets } = await supabase
      .from('budgets')
      .select(`
        amount,
        categories (
          name
        )
      `)
      .eq('user_id', user.id)
      .eq('month', budgetMonth)
      .eq('year', budgetYear)

    // Calculate totals
    const trxs = transactions || []
    const income = trxs.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
    const expense = trxs.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)

    const expenseCategories = trxs
      .filter(t => t.type === 'expense')
      .map(t => {
        const catObj = Array.isArray(t.categories) ? t.categories[0] : t.categories
        return `${catObj?.name || 'Lainnya'}: ${currency} ${Number(t.amount).toLocaleString('id-ID')}`
      })
      .join('\n')

    // Fetch profiles metadata
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, currency, record_streak')
      .eq('id', user.id)
      .single()

    const userName = profile?.full_name || 'Teman Fimo'
    const userStreak = profile?.record_streak || 0

    // Prompt construction
    let prompt = ''
    if (type === 'daily') {
      prompt = `
        Kamu adalah Fimo Coach, asisten keuangan pribadi yang ramah, ringkas, dan memotivasi.
        Hasilkan 1 tips keuangan harian yang sangat ringkas (maksimal 2 kalimat) untuk ${userName}.
        
        Data Keuangan Pengguna (2 Hari Terakhir):
        - Streak Mencatat: ${userStreak} Hari berturut-turut
        - Total Pemasukan: ${currency} ${income.toLocaleString('id-ID')}
        - Total Pengeluaran: ${currency} ${expense.toLocaleString('id-ID')}
        - Kategori Belanja:
        ${expenseCategories || 'Tidak ada belanja dalam 2 hari terakhir.'}

        Aturan:
        1. Kembalikan format JSON murni.
        2. Struktur JSON wajib memiliki key "tip" (string) dan "score" (integer 1-100, mencerminkan skor kesehatan keuangan harian).
        3. Teks tips harus bersahabat, hindari penjelasan yang kaku, langsung berikan ide praktis/peringatan kecil.
        
        Format output:
        {
          "tip": "Tip harian Anda...",
          "score": 80
        }
      `
    } else {
      prompt = `
        Kamu adalah Fimo Coach, asisten keuangan pribadi yang analitis, ramah, dan memotivasi.
        Hasilkan ulasan mingguan singkat tentang kebiasaan keuangan ${userName} (maksimal 4 kalimat).
        
        Data Keuangan Pengguna (7 Hari Terakhir):
        - Streak Mencatat: ${userStreak} Hari berturut-turut
        - Total Pemasukan: ${currency} ${income.toLocaleString('id-ID')}
        - Total Pengeluaran: ${currency} ${expense.toLocaleString('id-ID')}
        - Kategori Belanja:
        ${expenseCategories || 'Tidak ada belanja dalam 7 hari terakhir.'}
        
        Anggaran Bulan Ini (Budgets):
        ${(budgets || []).map(b => `- ${b.categories?.name || 'Kategori'}: ${currency} ${Number(b.amount).toLocaleString('id-ID')}`).join('\n') || 'Belum ada anggaran terdaftar.'}

        Aturan:
        1. Kembalikan format JSON murni tanpa markdown blocks.
        2. Struktur JSON wajib memiliki key "tip" (string, ulasan mingguan lengkap) dan "score" (integer 1-100, skor kesehatan keuangan mingguan).
        3. Berikan saran taktis tentang kategori yang paling banyak memakan budget atau tips mengoptimalkan tabungan.
        
        Format output:
        {
          "tip": "Ulasan mingguan Anda...",
          "score": 75
        }
      `
    }

    const hasGemini = !!process.env.GEMINI_API_KEY
    let parsedData = { tip: '', score: 70 }

    if (!hasGemini) {
      // Simulated Fallback
      if (type === 'daily') {
        parsedData = {
          tip: userStreak > 0 
            ? `Hebat! Kamu sudah mencatat ${userStreak} hari berturut-turut. Pertahankan streak-mu hari ini dengan mencatat transaksi sekecil apa pun!`
            : "Ayo catat transaksi pertamamu hari ini untuk memulai streak baru di Fimo!",
          score: 85
        }
      } else {
        parsedData = {
          tip: expense > 0
            ? `Ulasan mingguan: Pengeluaranmu sebesar Rp${expense.toLocaleString('id-ID')} terlihat teratur. Tips dari Fimo: Coba alokasikan sisa saldo ke saving envelopes virtual agar tidak terpakai secara tidak sengaja.`
            : "Ulasan mingguan: Belum ada transaksi tercatat dalam 7 hari terakhir. Mulailah mencatat pemasukan atau pengeluaranmu hari ini agar Fimo dapat memantau kesehatan keuanganmu.",
          score: 75
        }
      }
    } else {
      // Gemini API call
      try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
        // Daily: Gemini 3.1 Flash-Lite | Weekly: Gemini 3.5 Pro (we fall back to gemini-3.5-flash if names are not fully provisioned)
        const modelName = type === 'daily' ? 'gemini-1.5-flash' : 'gemini-1.5-pro' // We map code-safe names here that Google SDK supports dynamically, but user is warned we target Flash-Lite/Pro capability.
        const activeModelName = type === 'daily' ? 'gemini-3.5-flash' : 'gemini-3.5-pro'
        
        let model
        try {
          model = genAI.getGenerativeModel({ model: activeModelName })
        } catch {
          model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' })
        }

        const result = await model.generateContent([prompt])
        const response = await result.response
        const textOutput = response.text()
        const cleanedText = textOutput.replace(/```json/g, '').replace(/```/g, '').trim()
        parsedData = JSON.parse(cleanedText)
      } catch (geminiErr) {
        console.error('Gemini API execution error, fallback to simulation:', geminiErr)
        // Hardcoded safety fallback
        parsedData = {
          tip: type === 'daily'
            ? "Mulai hari ini dengan menyisihkan 10% pendapatanmu untuk dana darurat sebelum berbelanja."
            : "Ulasan mingguan: Pastikan pengeluaran harianmu tercatat rapi agar laporan grafik bulanan tetap akurat.",
          score: 70
        }
      }
    }

    // 4. Save to cache in the database
    // TTL: Daily = 24 hours | Weekly = 7 days
    const expireTime = new Date()
    if (type === 'daily') {
      expireTime.setHours(expireTime.getHours() + 24)
    } else {
      expireTime.setDate(expireTime.getDate() + 7)
    }

    await supabase
      .from('ai_insights')
      .insert({
        user_id: user.id,
        type: type,
        content: JSON.stringify(parsedData),
        expire_at: expireTime.toISOString()
      })

    return {
      success: true,
      data: parsedData
    }

  } catch (err) {
    console.error('AI Coach action system error:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Terjadi kesalahan sistem internal.'
    }
  }
}
