"use server"

import { createClient } from "@/lib/supabase/server"
import { GoogleGenAI } from "@google/genai"

export interface AICoachInsightResult {
  success: boolean
  data?: {
    tip: string
    score?: number
  }
  error?: string
}

// Helper: hitung skor fallback berdasarkan aturan prompt
function calculateFallbackScore(
  type: "daily" | "weekly" | "30days" | "month",
  income: number,
  expense: number,
  income30Days: number,
  totalBudget: number
): number {
  // Rule: skor 0 jika tidak ada transaksi sama sekali
  if (income === 0 && expense === 0) return 0

  if (type === "daily") {
    // Daily rules:
    // - Expense > 20% income30Days -> score < 55
    // - Expense <= 5% income30Days -> healthy (score 80+)
    if (income30Days > 0) {
      const expenseRatio = expense / income30Days
      if (expenseRatio > 0.2) return 45 // pemborosan mendadak
      if (expenseRatio > 0.05) return 65 // sedikit berlebih
      return 85 // sehat
    }
    // Tidak ada income30Days referensi, beri skor moderat
    return expense > 0 ? 70 : 75
  }

  if (type === "weekly") {
    // Weekly rules:
    // - Expense > 30% income30Days -> score < 50
    // - Over budget -> score < 40
    // - Controlled -> score 70-100
    if (totalBudget > 0 && expense > totalBudget) return 35
    if (income30Days > 0) {
      const expenseRatio = expense / income30Days
      if (expenseRatio > 0.3) return 45
      if (expenseRatio > 0.25) return 60
      return 75
    }
    return expense > 0 ? 70 : 75
  }

  if (type === "30days") {
    // 30days rules:
    // - Defisit (expense > income) -> score < 45
    // - Savings rate >= 20% -> score > 80
    if (expense > income) return 40
    if (income > 0) {
      const savingsRate = (income - expense) / income
      if (savingsRate >= 0.2) return 85
      if (savingsRate >= 0.1) return 75
      return 65
    }
    return expense > 0 ? 65 : 70
  }

  // "month"
  // - Expense > totalBudget -> score < 45
  if (totalBudget > 0 && expense > totalBudget) return 40
  if (totalBudget > 0) {
    const budgetUsage = expense / totalBudget
    if (budgetUsage <= 0.5) return 85
    if (budgetUsage <= 0.8) return 75
    return 60
  }
  return expense > 0 ? 70 : 75
}

export async function getAICoachInsight(type: "daily" | "weekly" | "30days" | "month"): Promise<AICoachInsightResult> {
  const supabase = createClient()
  
  try {
    // 1. Get current authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: "Unauthorized" }
    }

    // 2. Check for active cached insight in database
    const { data: cached } = await supabase
      .from("ai_insights")
      .select("content, expire_at")
      .eq("user_id", user.id)
      .eq("type", type)
      .gt("expire_at", new Date().toISOString())
      .order("expire_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (cached) {
      try {
        const parsedContent = JSON.parse(cached.content)
        return { success: true, data: parsedContent }
      } catch (parseErr) {
        console.error("Error parsing cached insight content:", parseErr)
      }
    }

    // 3. Cache missed or expired: Fetch recent transactions and budgets
    const currency = "IDR"
    let startDate: string
    const now = new Date()
    const toYYYYMMDD = (d: Date) => d.toISOString().split("T")[0]

    if (type === "daily") {
      const twoDaysAgo = new Date()
      twoDaysAgo.setDate(now.getDate() - 1)
      startDate = toYYYYMMDD(twoDaysAgo)
    } else if (type === "weekly") {
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(now.getDate() - 6)
      startDate = toYYYYMMDD(sevenDaysAgo)
    } else if (type === "30days") {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(now.getDate() - 29)
      startDate = toYYYYMMDD(thirtyDaysAgo)
    } else { // "month"
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      startDate = toYYYYMMDD(firstDayOfMonth)
    }

    // Fetch transactions
    const { data: transactions } = await supabase
      .from("transactions")
      .select(`
        amount,
        type,
        description,
        transaction_date,
        categories (
          name
        )
      `)
      .eq("user_id", user.id)
      .gte("transaction_date", startDate)
      .lte("transaction_date", toYYYYMMDD(now))

    // Fetch total income of the last 30 days as a reference for context
    const thirtyDaysAgoForRef = new Date()
    thirtyDaysAgoForRef.setDate(now.getDate() - 29)
    const startDate30DaysForRef = toYYYYMMDD(thirtyDaysAgoForRef)

    const { data: income30DaysData } = await supabase
      .from("transactions")
      .select("amount")
      .eq("user_id", user.id)
      .eq("type", "income")
      .gte("transaction_date", startDate30DaysForRef)
      .lte("transaction_date", toYYYYMMDD(now))

    const income30Days = (income30DaysData || []).reduce((s, t) => s + Number(t.amount), 0)

    // Fetch current monthly budgets
    const budgetMonth = now.getMonth() + 1
    const budgetYear = now.getFullYear()
    const { data: budgets } = await supabase
      .from("budgets")
      .select(`
        amount,
        categories (
          name
        )
      `)
      .eq("user_id", user.id)
      .eq("month", budgetMonth)
      .eq("year", budgetYear)

    const totalBudget = (budgets || []).reduce((s, b) => s + Number(b.amount || 0), 0)

    // Calculate totals
    const trxs = transactions || []
    const income = trxs.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0)
    const expense = trxs.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0)

    const expenseCategories = trxs
      .filter(t => t.type === "expense")
      .map(t => {
        const catObj = Array.isArray(t.categories) ? t.categories[0] : t.categories
        return `${catObj?.name || "Lainnya"}: ${currency} ${Number(t.amount).toLocaleString("id-ID")}`
      })
      .join("\n")

    // Fetch profiles metadata
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, currency, record_streak")
      .eq("id", user.id)
      .single()

    const userName = profile?.full_name || "Teman Fimo"
    const userStreak = profile?.record_streak || 0

    // Prompt construction
    let prompt = ""
    if (type === "daily") {
      prompt = `
        Kamu adalah Fimo Coach, asisten keuangan pribadi yang ramah, realistis, dan analitis.
        Berikan ulasan analisis keuangan singkat berdasarkan data riil 2 hari terakhir di bawah (1 kalimat), lalu ikuti dengan 1 tips keuangan taktis harian (1 kalimat) untuk ${userName}. Total output maksimal 2 kalimat.
        
        Data Keuangan Pengguna (2 Hari Terakhir):
        - Streak Mencatat: ${userStreak} Hari berturut-turut
        - Total Pemasukan (2 Hari Terakhir): ${currency} ${income.toLocaleString("id-ID")}
        - Total Pengeluaran (2 Hari Terakhir): ${currency} ${expense.toLocaleString("id-ID")}
        - Referensi Pemasukan (30 Hari Terakhir): ${currency} ${income30Days.toLocaleString("id-ID")}
        - Kategori Belanja & Nominal:
        ${expenseCategories || "Tidak ada belanja dalam 2 hari terakhir."}

        Aturan Penilaian & Output:
        1. Kembalikan format JSON murni.
        2. Struktur JSON wajib memiliki key "tip" (string) dan "score" (integer 0-100).
        3. Aturan Skor Kesehatan Keuangan Harian (Tingkat Realistis Tinggi):
           - Jangan anggap pengguna mengalami defisit hanya karena pemasukan 2 hari terakhir bernilai 0. Bandingkan pengeluaran 2 hari terakhir terhadap Referensi Pemasukan (30 Hari Terakhir). Pengeluaran harian wajar adalah maksimal 3-5% dari referensi pemasukan 30 hari terakhir.
           - Jika tidak ada transaksi sama sekali dalam 2 hari terakhir (Pemasukan = 0 dan Pengeluaran = 0), skor WAJIB bernilai 0. Tips harus memotivasi user dengan ramah untuk mulai mencatat transaksi pertamanya agar AI bisa menganalisis.
           - Jika total pengeluaran 2 hari terakhir melebihi 20% dari referensi pemasukan 30 hari terakhir, berikan skor di bawah 55 (indikasi pemborosan mendadak).
           - Tentukan skor (55-100) secara kritis dan realistis berdasarkan rasio belanja harian terhadap referensi pemasukan bulanan tersebut. Berikan sedikit bonus skor jika streak mencatat bertambah banyak.
        4. Larangan Halusinasi:
           - Jangan sebutkan kategori belanja apa pun (seperti Makanan, Kopi, Transport) jika kategori tersebut tidak tercatat di dalam "Kategori Belanja" di atas.
           - Hanya berikan saran taktis berdasarkan data nominal pengeluaran dan pemasukan riil di atas.
        
        Format output:
        {
          "tip": "Tip harian Anda...",
          "score": 80
        }
      `
    } else if (type === "weekly") {
      prompt = `
        Kamu adalah Fimo Coach, asisten keuangan pribadi yang analitis, realistis, dan memotivasi.
        Berikan ulasan analisis keuangan mingguan terperinci berdasarkan data 7 hari terakhir (2 kalimat) dan evaluasi kepatuhan anggaran (1-2 kalimat) untuk ${userName}. Total output maksimal 4 kalimat.
        
        Data Keuangan Pengguna (7 Hari Terakhir):
        - Streak Mencatat: ${userStreak} Hari berturut-turut
        - Total Pemasukan (7 Hari Terakhir): ${currency} ${income.toLocaleString("id-ID")}
        - Total Pengeluaran (7 Hari Terakhir): ${currency} ${expense.toLocaleString("id-ID")}
        - Referensi Pemasukan (30 Hari Terakhir): ${currency} ${income30Days.toLocaleString("id-ID")}
        - Kategori Belanja & Nominal:
        ${expenseCategories || "Tidak ada belanja dalam 7 hari terakhir."}
        
        Anggaran Bulan Ini (Budgets):
        ${(budgets || []).map(b => {
          const budgetCategoryObj = Array.isArray(b.categories) ? b.categories[0] : b.categories
          const budgetCatName = (budgetCategoryObj as { name: string } | null)?.name || "Kategori"
          return `- ${budgetCatName}: ${currency} ${Number(b.amount).toLocaleString("id-ID")}`
        }).join("\n") || "Belum ada anggaran terdaftar."}

        Aturan Penilaian & Output:
        1. Kembalikan format JSON murni tanpa markdown blocks.
        2. Struktur JSON wajib memiliki key "tip" (string) dan "score" (integer 0-100).
        3. Aturan Skor Kesehatan Keuangan Mingguan (Tingkat Realistis Tinggi):
           - Jangan anggap pengguna mengalami defisit hanya karena pemasukan 7 hari terakhir bernilai 0. Bandingkan pengeluaran 7 hari terakhir terhadap Referensi Pemasukan (30 Hari Terakhir). Pengeluaran mingguan sehat adalah maksimal 20-25% dari referensi pemasukan 30 hari terakhir.
           - Jika tidak ada transaksi sama sekali dalam 7 hari terakhir (Pemasukan = 0 dan Pengeluaran = 0), skor WAJIB bernilai 0. Tips harus memotivasi untuk mulai mencatat keuangan agar analisis berjalan.
           - Jika Pengeluaran melebihi anggaran yang ditentukan untuk kategori tersebut, skor harus di bawah 40.
           - Jika total pengeluaran 7 hari terakhir melebihi 30% dari referensi pemasukan 30 hari terakhir, berikan skor di bawah 50.
           - Jika pengeluaran terkontrol dengan baik di bawah batas anggaran dan batas mingguan sehat, berikan skor 70-100 yang proporsional.
        4. Larangan Halusinasi:
           - Jangan berasumsi pengguna membeli barang, berlangganan, atau berbelanja di luar data nyata yang disediakan di atas.
           - Berikan analisis logis dan kritis mengenai batas anggaran bulanan versus total pengeluaran 7 hari terakhir.
        
        Format output:
        {
          "tip": "Ulasan mingguan Anda...",
          "score": 75
        }
      `
    } else if (type === "30days") {
      prompt = `
        Kamu adalah Fimo Coach, asisten keuangan pribadi yang profesional, realistis, dan berorientasi jangka panjang.
        Hasilkan ulasan analisis keuangan mendalam mengenai total pemasukan dan pengeluaran 30 hari terakhir, analisis rasio tabungan riil (2 kalimat), serta rekomendasi alokasi taktis jangka panjang (1-2 kalimat) untuk ${userName}. Total output maksimal 4 kalimat.
        
        Data Keuangan Pengguna (30 Hari Terakhir):
        - Streak Mencatat: ${userStreak} Hari berturut-turut
        - Total Pemasukan: ${currency} ${income.toLocaleString("id-ID")}
        - Total Pengeluaran: ${currency} ${expense.toLocaleString("id-ID")}
        - Kategori Belanja & Nominal:
        ${expenseCategories || "Tidak ada belanja dalam 30 hari terakhir."}

        Aturan Penilaian & Output:
        1. Kembalikan format JSON murni.
        2. Struktur JSON wajib memiliki key "tip" (string) dan "score" (integer 0-100).
        3. Aturan Skor Kesehatan Keuangan 30 Hari:
           - Jika tidak ada transaksi sama sekali (Pemasukan = 0 dan Pengeluaran = 0), skor WAJIB bernilai 0. Tips harus mengajak pengguna untuk mulai membiasakan mencatat pengeluaran bulanannya.
           - Jika Pengeluaran > Pemasukan (defisit bulanan), skor wajib di bawah 45. Berikan saran alokasi darurat.
           - Jika rasio tabungan (Pemasukan - Pengeluaran) / Pemasukan >= 20%, berikan skor di atas 80.
        4. Larangan Halusinasi:
           - Jangan sebutkan kategori belanja atau pengeluaran spesifik apa pun jika kategori tersebut tidak tertera di data atas.
        
        Format output:
        {
          "tip": "Evaluasi 30 hari Anda...",
          "score": 85
        }
      `
    } else { // "month"
      prompt = `
        Kamu adalah Fimo Coach, asisten keuangan pribadi yang kritis, detail, dan realistis.
        Hasilkan ulasan analisis kepatuhan anggaran bulan berjalan (Bulan Ini) dengan membandingkan total pengeluaran per kategori belanja dengan batas anggaran bulanan yang ditentukan (2 kalimat), diikuti rekomendasi penyesuaian arus kas (1-2 kalimat) untuk ${userName}. Total output maksimal 4 kalimat.
        
        Data Keuangan Pengguna (Bulan Ini):
        - Total Pemasukan: ${currency} ${income.toLocaleString("id-ID")}
        - Total Pengeluaran: ${currency} ${expense.toLocaleString("id-ID")}
        - Kategori Belanja & Nominal:
        ${expenseCategories || "Tidak ada belanja di bulan ini."}
        
        Anggaran Terdaftar Bulan Ini (Budgets):
        ${(budgets || []).map(b => {
          const budgetCategoryObj = Array.isArray(b.categories) ? b.categories[0] : b.categories
          const budgetCatName = (budgetCategoryObj as { name: string } | null)?.name || "Kategori"
          return `- ${budgetCatName}: ${currency} ${Number(b.amount).toLocaleString("id-ID")}`
        }).join("\n") || "Belum ada anggaran terdaftar."}

        Aturan Penilaian & Output:
        1. Kembalikan format JSON murni.
        2. Struktur JSON wajib memiliki key "tip" (string) dan "score" (integer 0-100).
        3. Aturan Skor Kesehatan Keuangan Bulan Ini:
           - Jika tidak ada transaksi sama sekali (Pemasukan = 0 dan Pengeluaran = 0), skor WAJIB bernilai 0.
           - Jika total pengeluaran melebihi total anggaran bulan ini, skor harus di bawah 45.
           - Berikan evaluasi tentang seberapa baik pengguna mematuhi rencana anggaran bulanan mereka.
        4. Larangan Halusinasi:
           - Hanya ulas kategori yang ada di daftar pengeluaran atau anggaran di atas.
        
        Format output:
        {
          "tip": "Analisis anggaran bulan ini...",
          "score": 75
        }
      `
    }

    const hasGemini = !!process.env.GEMINI_API_KEY
    let parsedData = { tip: "", score: 70 }

    if (!hasGemini) {
      // Simulated Fallback — score dihitung berdasarkan aturan prompt
      const fallbackScore = calculateFallbackScore(type, income, expense, income30Days, totalBudget)

      if (type === "daily") {
        parsedData = {
          tip: (income === 0 && expense === 0)
            ? "Mulai catat transaksi pertamamu hari ini agar Fimo AI bisa menganalisis kesehatan keuanganmu."
            : userStreak > 0
              ? `Hebat! Kamu sudah menjaga streak mencatat selama ${userStreak} hari. Pertahankan kebiasaan ini!`
              : "Yuk catat pengeluaranmu hari ini agar analisis keuangan tetap akurat!",
          score: fallbackScore
        }
      } else if (type === "weekly") {
        parsedData = {
          tip: (income === 0 && expense === 0)
            ? "Ulasan mingguan: Belum ada catatan transaksi. Mari mulai catat agar analisis berjalan."
            : expense > 0
              ? `Ulasan mingguan: Pengeluaranmu sebesar Rp${expense.toLocaleString("id-ID")}. Pastikan tetap dalam batas anggaran bulanan.`
              : "Ulasan mingguan: Belum ada transaksi dalam 7 hari terakhir.",
          score: fallbackScore
        }
      } else if (type === "30days") {
        parsedData = {
          tip: (income === 0 && expense === 0)
            ? "Analisis 30 hari: Belum ada transaksi. Mulailah mencatat secara rutin."
            : expense > income
              ? "Analisis 30 hari: Pengeluaran melebihi pemasukan. Saatnya evaluasi pola belanja."
              : "Analisis 30 hari: Arus kas terpantau. Pertahankan rasio menabung di atas 20%.",
          score: fallbackScore
        }
      } else { // "month"
        parsedData = {
          tip: (income === 0 && expense === 0)
            ? "Analisis bulan ini: Belum ada transaksi. Buat anggaran dan mulai catat."
            : totalBudget > 0 && expense > totalBudget
              ? "Analisis bulan ini: Pengeluaran melebihi anggaran. Saatnya tinjau kembali budget."
              : "Analisis bulan ini: Pengeluaran terkontrol. Pertahankan kepatuhan anggaran.",
          score: fallbackScore
        }
      }
    } else {
      // Gemini API call
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })
        const activeModelName = "gemini-2.5-flash"
        
        const result = await ai.models.generateContent({
          model: activeModelName,
          contents: prompt
        })
        const textOutput = result.text ?? ""
        const cleanedText = textOutput.replace(/```json/g, "").replace(/```/g, "").trim()
        parsedData = JSON.parse(cleanedText)
      } catch (geminiErr) {
        console.error("Gemini API execution error, fallback to simulation:", geminiErr)
        // Hardcoded safety fallback — score dihitung berdasarkan aturan prompt
        const fallbackScore = calculateFallbackScore(type, income, expense, income30Days, totalBudget)

        if (type === "daily") {
          parsedData = {
            tip: (income === 0 && expense === 0)
              ? "Mulai catat transaksi pertamamu hari ini agar Fimo AI bisa menganalisis kesehatan keuanganmu."
              : "Mulai hari ini dengan menyisihkan 10% pendapatanmu untuk dana darurat sebelum berbelanja.",
            score: fallbackScore
          }
        } else if (type === "weekly") {
          parsedData = {
            tip: (income === 0 && expense === 0)
              ? "Ulasan mingguan: Belum ada catatan transaksi. Mari buat catatan pertama Anda."
              : "Ulasan mingguan: Pastikan pengeluaran harianmu tercatat rapi agar laporan tetap akurat.",
            score: fallbackScore
          }
        } else if (type === "30days") {
          parsedData = {
            tip: (income === 0 && expense === 0)
              ? "Analisis 30 hari: Belum ada transaksi. Mulailah mencatat pengeluaran dan pemasukan."
              : "Analisis 30 hari: Pengeluaran bulananmu terpantau aktif. Jagalah kebiasaan mencatat.",
            score: fallbackScore
          }
        } else { // "month"
          parsedData = {
            tip: (income === 0 && expense === 0)
              ? "Analisis bulan ini: Belum ada transaksi. Buat anggaran pertamamu."
              : "Analisis bulan ini: Tetap patuhi batas anggaran per kategori.",
            score: fallbackScore
          }
        }
      }
    }

    // 4. Save to cache in the database
    const expireTime = new Date()
    if (type === "daily") {
      expireTime.setHours(expireTime.getHours() + 24)
    } else if (type === "weekly") {
      expireTime.setDate(expireTime.getDate() + 3)
    } else if (type === "30days") {
      expireTime.setDate(expireTime.getDate() + 7)
    } else { // "month"
      expireTime.setDate(expireTime.getDate() + 7)
    }

    await supabase
      .from("ai_insights")
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
    console.error("AI Coach action system error:", err)
    return {
      success: false,
      error: err instanceof Error ? err.message : "Terjadi kesalahan sistem internal."
    }
  }
}
