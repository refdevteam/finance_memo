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

export async function getAICoachInsight(type: 'daily' | 'weekly' | '30days' | 'month'): Promise<AICoachInsightResult> {
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
    } else if (type === 'weekly') {
      // Last 7 days
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(now.getDate() - 6)
      startDate = toYYYYMMDD(sevenDaysAgo)
    } else if (type === '30days') {
      // Last 30 days
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(now.getDate() - 29)
      startDate = toYYYYMMDD(thirtyDaysAgo)
    } else { // 'month'
      // From 1st of this month
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      startDate = toYYYYMMDD(firstDayOfMonth)
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

    // Fetch total income of the last 30 days as a reference for context (highly accurate)
    const thirtyDaysAgoForRef = new Date()
    thirtyDaysAgoForRef.setDate(now.getDate() - 29)
    const startDate30DaysForRef = toYYYYMMDD(thirtyDaysAgoForRef)

    const { data: income30DaysData } = await supabase
      .from('transactions')
      .select('amount')
      .eq('user_id', user.id)
      .eq('type', 'income')
      .gte('transaction_date', startDate30DaysForRef)
      .lte('transaction_date', toYYYYMMDD(now))

    const income30Days = (income30DaysData || []).reduce((s, t) => s + Number(t.amount), 0)

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
        Kamu adalah Fimo Coach, asisten keuangan pribadi yang ramah, realistis, dan analitis.
        Berikan ulasan analisis keuangan singkat berdasarkan data riil 2 hari terakhir di bawah (1 kalimat), lalu ikuti dengan 1 tips keuangan taktis harian (1 kalimat) untuk ${userName}. Total output maksimal 2 kalimat.
        
        Data Keuangan Pengguna (2 Hari Terakhir):
        - Streak Mencatat: ${userStreak} Hari berturut-turut
        - Total Pemasukan (2 Hari Terakhir): ${currency} ${income.toLocaleString('id-ID')}
        - Total Pengeluaran (2 Hari Terakhir): ${currency} ${expense.toLocaleString('id-ID')}
        - Referensi Pemasukan (30 Hari Terakhir): ${currency} ${income30Days.toLocaleString('id-ID')}
        - Kategori Belanja & Nominal:
        ${expenseCategories || 'Tidak ada belanja dalam 2 hari terakhir.'}

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
    } else if (type === 'weekly') {
      prompt = `
        Kamu adalah Fimo Coach, asisten keuangan pribadi yang analitis, realistis, dan memotivasi.
        Berikan ulasan analisis keuangan mingguan terperinci berdasarkan data 7 hari terakhir (2 kalimat) dan evaluasi kepatuhan anggaran (1-2 kalimat) untuk ${userName}. Total output maksimal 4 kalimat.
        
        Data Keuangan Pengguna (7 Hari Terakhir):
        - Streak Mencatat: ${userStreak} Hari berturut-turut
        - Total Pemasukan (7 Hari Terakhir): ${currency} ${income.toLocaleString('id-ID')}
        - Total Pengeluaran (7 Hari Terakhir): ${currency} ${expense.toLocaleString('id-ID')}
        - Referensi Pemasukan (30 Hari Terakhir): ${currency} ${income30Days.toLocaleString('id-ID')}
        - Kategori Belanja & Nominal:
        ${expenseCategories || 'Tidak ada belanja dalam 7 hari terakhir.'}
        
        Anggaran Bulan Ini (Budgets):
        ${(budgets || []).map(b => {
          const budgetCategoryObj = Array.isArray(b.categories) ? b.categories[0] : b.categories
          const budgetCatName = (budgetCategoryObj as { name: string } | null)?.name || 'Kategori'
          return `- ${budgetCatName}: ${currency} ${Number(b.amount).toLocaleString('id-ID')}`
        }).join('\n') || 'Belum ada anggaran terdaftar.'}

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
    } else if (type === '30days') {
      prompt = `
        Kamu adalah Fimo Coach, asisten keuangan pribadi yang profesional, realistis, dan berorientasi jangka panjang.
        Hasilkan ulasan analisis keuangan mendalam mengenai total pemasukan dan pengeluaran 30 hari terakhir, analisis rasio tabungan riil (2 kalimat), serta rekomendasi alokasi taktis jangka panjang (1-2 kalimat) untuk ${userName}. Total output maksimal 4 kalimat.
        
        Data Keuangan Pengguna (30 Hari Terakhir):
        - Streak Mencatat: ${userStreak} Hari berturut-turut
        - Total Pemasukan: ${currency} ${income.toLocaleString('id-ID')}
        - Total Pengeluaran: ${currency} ${expense.toLocaleString('id-ID')}
        - Kategori Belanja & Nominal:
        ${expenseCategories || 'Tidak ada belanja dalam 30 hari terakhir.'}

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
    } else { // 'month'
      prompt = `
        Kamu adalah Fimo Coach, asisten keuangan pribadi yang kritis, detail, dan realistis.
        Hasilkan ulasan analisis kepatuhan anggaran bulan berjalan (Bulan Ini) dengan membandingkan total pengeluaran per kategori belanja dengan batas anggaran bulanan yang ditentukan (2 kalimat), diikuti rekomendasi penyesuaian arus kas (1-2 kalimat) untuk ${userName}. Total output maksimal 4 kalimat.
        
        Data Keuangan Pengguna (Bulan Ini):
        - Total Pemasukan: ${currency} ${income.toLocaleString('id-ID')}
        - Total Pengeluaran: ${currency} ${expense.toLocaleString('id-ID')}
        - Kategori Belanja & Nominal:
        ${expenseCategories || 'Tidak ada belanja di bulan ini.'}
        
        Anggaran Terdaftar Bulan Ini (Budgets):
        ${(budgets || []).map(b => {
          const budgetCategoryObj = Array.isArray(b.categories) ? b.categories[0] : b.categories
          const budgetCatName = (budgetCategoryObj as { name: string } | null)?.name || 'Kategori'
          return `- ${budgetCatName}: ${currency} ${Number(b.amount).toLocaleString('id-ID')}`
        }).join('\n') || 'Belum ada anggaran terdaftar.'}

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
    let parsedData = { tip: '', score: 70 }

    if (!hasGemini) {
      // Simulated Fallback
      if (type === 'daily') {
        parsedData = {
          tip: userStreak > 0 
            ? `Hebat! Kamu sudah menjaga streak mencatat selama ${userStreak} hari berturut-turut. Yuk pertahankan kebiasaan ini dengan mencatat pengeluaranmu hari ini!`
            : "Ayo catat transaksi pertama Anda hari ini untuk memulai langkah pertama mengelola keuangan!",
          score: (income === 0 && expense === 0) ? 0 : 85
        }
      } else if (type === 'weekly') {
        parsedData = {
          tip: expense > 0
            ? `Ulasan mingguan: Pengeluaranmu sebesar Rp${expense.toLocaleString('id-ID')} terpantau rapi. Cobalah alokasikan sisa saldo ke dalam tabungan digital agar tidak terpakai secara tidak sengaja.`
            : "Ulasan mingguan: Belum ada transaksi tercatat dalam 7 hari terakhir. Mari mulai catat pengeluaran atau pemasukan pertamamu agar Fimo bisa menganalisis kebiasaan belanjamu secara detail.",
          score: (income === 0 && expense === 0) ? 0 : 75
        }
      } else if (type === '30days') {
        parsedData = {
          tip: expense > 0
            ? `Analisis 30 hari terakhir: Pengeluaran total sebesar Rp${expense.toLocaleString('id-ID')} dengan pemasukan Rp${income.toLocaleString('id-ID')}. Pertahankan rasio menabungmu di atas 20% agar finansial jangka panjang aman.`
            : "Analisis 30 hari terakhir: Belum ada transaksi tercatat selama 30 hari terakhir. Silakan catat transaksi harianmu secara rutin agar Fimo dapat memetakan pola keuangan bulananmu secara akurat.",
          score: (income === 0 && expense === 0) ? 0 : 80
        }
      } else { // 'month'
        parsedData = {
          tip: expense > 0
            ? `Analisis bulan ini: Pola belanja bulananmu terpantau terkontrol. Pastikan pengeluaran tiap kategori tidak melebihi alokasi anggaran yang sudah kamu tetapkan demi menjaga kesehatan dompet.`
            : "Analisis bulan ini: Belum ada transaksi tercatat untuk bulan ini. Mari buat rancangan anggaran dan catat pengeluaran pertamamu bulan ini agar rencana finansialmu tetap terkendali.",
          score: (income === 0 && expense === 0) ? 0 : 78
        }
      }
    } else {
      // Gemini API call
      try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
        const activeModelName = (type === 'daily' || type === 'weekly') ? 'gemini-3.5-flash' : 'gemini-3.5-pro'
        
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
        if (type === 'daily') {
          parsedData = {
            tip: (income === 0 && expense === 0) 
              ? "Mulai catat transaksi pertamamu hari ini agar Fimo Coach bisa menganalisis kesehatan keuanganmu."
              : "Mulai hari ini dengan menyisihkan 10% pendapatanmu untuk dana darurat sebelum berbelanja.",
            score: (income === 0 && expense === 0) ? 0 : 70
          }
        } else if (type === 'weekly') {
          parsedData = {
            tip: (income === 0 && expense === 0)
              ? "Ulasan mingguan: Belum ada catatan transaksi. Mari buat catatan pertama Anda agar grafik analisis terisi."
              : "Ulasan mingguan: Pastikan pengeluaran harianmu tercatat rapi agar laporan grafik bulanan tetap akurat.",
            score: (income === 0 && expense === 0) ? 0 : 70
          }
        } else if (type === '30days') {
          parsedData = {
            tip: (income === 0 && expense === 0)
              ? "Analisis 30 hari terakhir: Belum ada transaksi tercatat. Mulailah mencatat transaksi pengeluaran dan pemasukan Anda."
              : "Analisis 30 hari terakhir: Pengeluaran bulananmu terpantau aktif. Jagalah kebiasaan baik mencatat agar arus kas terpetakan dengan baik.",
            score: (income === 0 && expense === 0) ? 0 : 70
          }
        } else { // 'month'
          parsedData = {
            tip: (income === 0 && expense === 0)
              ? "Analisis bulan ini: Belum ada transaksi tercatat. Buat anggaran pertamamu bulan ini agar pengeluaran lebih terarah."
              : "Analisis bulan ini: Tetap patuhi batas anggaran per kategori agar kondisi finansial akhir bulan tetap stabil.",
            score: (income === 0 && expense === 0) ? 0 : 70
          }
        }
      }
    }

    // 4. Save to cache in the database
    // TTL: Daily = 24 hours | Weekly = 3 days | 30days = 7 days | month = 7 days
    const expireTime = new Date()
    if (type === 'daily') {
      expireTime.setHours(expireTime.getHours() + 24)
    } else if (type === 'weekly') {
      expireTime.setDate(expireTime.getDate() + 3)
    } else if (type === '30days') {
      expireTime.setDate(expireTime.getDate() + 7)
    } else { // 'month'
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
