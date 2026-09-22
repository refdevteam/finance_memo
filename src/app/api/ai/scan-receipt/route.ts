import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GoogleGenAI } from '@google/genai'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const hasGroq = !!process.env.GROQ_API_KEY
    const hasGemini = !!process.env.GEMINI_API_KEY

    if (!hasGemini) {
      // Groq vision model (llama-3.2-11b-vision-preview) sudah decommissioned.
      // Scan struk memerlukan Gemini untuk multimodal vision.
      return NextResponse.json({ error: 'GEMINI_API_KEY diperlukan untuk fitur Scan Struk. Groq tidak lagi mendukung model vision gratis.' }, { status: 500 })
    }

    const formData = await req.formData()
    const file = formData.get('receipt') as File
    
    if (!file) {
      return NextResponse.json({ error: 'Tidak ada file struk yang diunggah' }, { status: 400 })
    }

    // Validasi Ukuran File (Maksimal 5MB untuk mencegah DoS dan pembengkakan memori)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Ukuran file terlalu besar. Maksimal adalah 5MB.' }, { status: 400 })
    }

    // Validasi Tipe File (Hanya gambar dan PDF yang diperbolehkan)
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
    if (!allowedMimeTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Format file tidak didukung. Silakan unggah gambar (JPEG, PNG, WebP) atau PDF.' }, { status: 400 })
    }

    // Rate Limiting Logic: Cek jumlah scan hari ini dari user (Maks 20 per hari untuk MVP)
    const today = new Date().toISOString().split('T')[0]
    const { count, error: countError } = await supabase
      .from('receipts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('scanned_at', `${today}T00:00:00Z`)

    if (countError) throw countError
    if (count && count >= 20) {
      return NextResponse.json(
        { error: 'Batas harian pemindaian struk (20/hari) telah habis. Silakan coba lagi besok.' }, 
        { status: 429 }
      )
    }

    // 1. Convert File to Base64
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64Data = buffer.toString('base64')
    
    const prompt = `
      Kamu adalah akuntan ahli dan sistem ekstraksi data yang sangat presisi. 
      Tugasmu adalah menganalisis gambar struk/nota/faktur belanja ini dan mengekstrak informasi penting ke dalam format JSON.
      
      Aturan ketat:
      1. Hanya kembalikan output dalam bentuk JSON murni. Jangan tambahkan kata pengantar, markdown, atau pembungkus lain.
      2. Jika gambar bukan struk, atau teks terlalu buram, set "success" menjadi false.
      3. Kolom "total_amount" harus berupa angka bulat (integer). Hapus koma/titik pada ribuan. Jika tidak ditemukan, set 0.
      4. "merchant_name" adalah nama toko (string). Jika tidak jelas, gunakan "Tidak Diketahui".
      5. "receipt_date" dalam format YYYY-MM-DD. Jika tidak ada, kembalikan null.
      6. "suggested_type" harus salah satu dari: "expense" atau "income". Secara default struk belanja adalah "expense".
      7. "suggested_category_name" adalah tebakan nama kategori umum (contoh: "Makan & Minum", "Transportasi", "Belanja Bulanan", "Kesehatan").
      
      Format Output Wajib:
      {
        "success": true,
        "merchant_name": "Nama Toko",
        "total_amount": 150000,
        "receipt_date": "2024-01-20",
        "suggested_type": "expense",
        "suggested_category_name": "Makan & Minum"
      }
    `

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let parsedData: any = null

    if (hasGroq && !hasGemini) {
      // Groq vision (llama-3.2-11b-vision-preview) sudah decommissioned
      // Tidak ada pengganti vision gratis di Groq saat ini
      return NextResponse.json({ error: 'Model vision Groq (llama-3.2-11b-vision-preview) sudah tidak tersedia. Gunakan GEMINI_API_KEY untuk scan struk.' }, { status: 500 })
    }

    // ==== MENGGUNAKAN GEMINI VISION (Multimodal) ====
    {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })

      const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              {
                inlineData: {
                  data: base64Data,
                  mimeType: file.type || 'image/jpeg'
                }
              }
            ]
          }
        ],
        config: { responseMimeType: 'application/json' }
      })

      const textOutput = result.text ?? ''
      const cleanedText = textOutput.replace(/```json/g, '').replace(/```/g, '').trim()
      parsedData = JSON.parse(cleanedText)
    }

    if (!parsedData || !parsedData.success) {
      return NextResponse.json({ error: 'Gambar tidak dikenali sebagai struk yang sah' }, { status: 400 })
    }

    // 5. Simpan ke tabel receipts di Supabase (sebagai history/log)
    const { data: receiptRow, error: insertError } = await supabase
      .from('receipts')
      .insert({
        user_id: user.id,
        image_url: 'placeholder_for_storage',
        merchant_name: parsedData.merchant_name,
        total_amount: parsedData.total_amount,
        receipt_date: parsedData.receipt_date,
        receipt_type: 'purchase',
        ai_extracted: parsedData,
        is_processed: false
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('Failed to save receipt record:', insertError)
    }

    return NextResponse.json({ 
      data: parsedData,
      receipt_id: receiptRow?.id 
    })

  } catch (error) {
    console.error('Scan receipt error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal Server Error' }, { status: 500 })
  }
}

