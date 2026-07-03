'use server'

import { createClient } from '@/lib/supabase/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

interface AIInsightResult {
  success: boolean
  data?: {
    summary: string
    financial_score: number
    tips: string[]
    warnings: string[]
  }
  error?: string
}

export async function generateMonthlyInsights(
  rangeType: '30days' | 'month',
  month: number,
  year: number
): Promise<AIInsightResult> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { success: false, error: 'Unauthorized' }

  const hasGroq = !!process.env.GROQ_API_KEY
  const hasGemini = !!process.env.GEMINI_API_KEY

  if (!hasGroq && !hasGemini) {
    // Return simulated insights if API key is not configured
    return {
      success: true,
      data: {
        summary: "Kunci API AI (Groq atau Gemini) belum dikonfigurasi. Ini adalah analisis simulasi Fimo: Pengeluaran bulanan Anda terlihat wajar, namun pastikan untuk mengalokasikan dana darurat minimal 10% dari pendapatan bulanan.",
        financial_score: 75,
        tips: [
          "Mulailah menyisihkan 10% pendapatan di awal bulan sebelum berbelanja.",
          "Batasi pengeluaran kategori Makan & Minum dengan menetapkan anggaran envelopes."
        ],
        warnings: [
          "Belum ada budget terdaftar untuk bulan ini. Buat budget di halaman Anggaran untuk memantau batas pengeluaran."
        ]
      }
    }
  }

  try {
    // 1. Fetch Profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, currency')
      .eq('id', user.id)
      .single()

    const currency = profile?.currency || 'IDR'
    const userName = profile?.full_name || 'Pengguna'

    // 2. Determine date range
    let startDate: string
    let endDate: string

    if (rangeType === '30days') {
      const now = new Date()
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(now.getDate() - 29)

      const toLocalYYYYMMDD = (d: Date) => {
        const y = d.getFullYear()
        const m = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        return `${y}-${m}-${day}`
      }
      startDate = toLocalYYYYMMDD(thirtyDaysAgo)
      endDate = toLocalYYYYMMDD(now)
    } else {
      startDate = `${year}-${String(month).padStart(2, '0')}-01`
      const lastDay = new Date(year, month, 0).getDate()
      endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    }

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
      .lte('transaction_date', endDate)

    // 3. Fetch Budgets (query current month/year if range is 30days)
    const currentMonth = new Date().getMonth() + 1
    const currentYear = new Date().getFullYear()
    const budgetMonth = rangeType === '30days' ? currentMonth : month
    const budgetYear = rangeType === '30days' ? currentYear : year

    const { data: budgets } = await supabase
      .from('budgets')
      .select(`
        amount,
        category_id,
        categories (
          name
        )
      `)
      .eq('user_id', user.id)
      .eq('month', budgetMonth)
      .eq('year', budgetYear)

    const trxs = transactions || []
    const totalIncome = trxs.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
    const totalExpense = trxs.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
    const netSavings = totalIncome - totalExpense

    // Compile list of categories and spending
    const expenseBreakdown: Record<string, number> = {}
    trxs.filter(t => t.type === 'expense').forEach(t => {
      const categoryObj = Array.isArray(t.categories) ? t.categories[0] : t.categories
      const catName = (categoryObj as { name: string } | null)?.name || 'Lainnya'
      expenseBreakdown[catName] = (expenseBreakdown[catName] || 0) + Number(t.amount)
    })

    const prompt = `
      Kamu adalah Fimo, asisten keuangan pribadi AI cerdas yang ramah, analitis, dan solutif.
      Berikan analisis keuangan bulanan (Bahasa Indonesia) berdasarkan data berikut untuk pengguna bernama ${userName}:
      
      Mata Uang Default: ${currency}
      Periode: ${rangeType === '30days' ? '30 Hari Terakhir dari Hari Ini' : `Bulan ${month} Tahun ${year}`}
      Total Pemasukan: ${currency} ${totalIncome}
      Total Pengeluaran: ${currency} ${totalExpense}
      Saldo Bersih Tabungan: ${currency} ${netSavings}
      
      Rincian Pengeluaran per Kategori:
      ${Object.entries(expenseBreakdown).map(([cat, amt]) => `- ${cat}: ${currency} ${amt}`).join('\n')}
      
      Anggaran Kategori (Budgets):
      ${(budgets || []).map(b => {
        const budgetCategoryObj = Array.isArray(b.categories) ? b.categories[0] : b.categories
        const budgetCatName = (budgetCategoryObj as { name: string } | null)?.name || 'Lainnya'
        return `- ${budgetCatName}: Target ${currency} ${b.amount}`
      }).join('\n')}
      
      Aturan ketat keluaran (output):
      1. Kembalikan respons dalam format JSON murni yang valid.
      2. Jangan sertakan tag markdown \`\`\`json atau blok teks penjelasan lain di luar JSON.
      3. Analisis harus kritis tapi memotivasi, gunakan kalimat pendek dan jelas.
      4. "financial_score" adalah angka bulat 1-100. Berikan nilai tinggi jika pemasukan jauh lebih besar dari pengeluaran, ada sisa tabungan sehat, dan tidak melebihi anggaran. Berikan nilai rendah jika pengeluaran membengkak.
      
      Format Output Wajib:
      {
        "summary": "Analisis ringkas kondisi finansial bulan ini...",
        "financial_score": 80,
        "tips": [
          "Tips praktis pertama untuk berhemat atau berinvestasi...",
          "Tips praktis kedua..."
        ],
        "warnings": [
          "Peringatan pertama jika ada pengeluaran berlebih di kategori tertentu atau melebihi anggaran...",
          "Peringatan kedua..."
        ]
      }
    `

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let parsedData: any = null

    if (hasGroq) {
      try {
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
            temperature: 0.2,
          }),
        })

        if (!response.ok) {
          const errData = await response.json()
          throw new Error(errData.error?.message || `Groq API returned status ${response.status}`)
        }

        const chatCompletion = await response.json()
        const textOutput = chatCompletion.choices[0]?.message?.content || ''
        parsedData = JSON.parse(textOutput)
      } catch (groqErr) {
        console.error('Groq insights generation failed:', groqErr)
        throw groqErr
      }
    } else {
      // ==== FALLBACK: MENGGUNAKAN GEMINI ====
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
      const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" })

      const result = await model.generateContent([prompt])
      const response = await result.response
      const textOutput = response.text()

      // Clean markdown if present
      const cleanedText = textOutput.replace(/```json/g, '').replace(/```/g, '').trim()
      parsedData = JSON.parse(cleanedText)
    }

    return {
      success: true,
      data: parsedData
    }
  } catch (error) {
    console.error('AI generate insights error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Terjadi kesalahan sistem saat menghubungi AI.'
    }
  }
}
