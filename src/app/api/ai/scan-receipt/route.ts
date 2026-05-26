import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Inisialisasi Gemini SDK
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Gemini API Key belum dikonfigurasi' }, { status: 500 })
    }

    const formData = await req.formData()
    const file = formData.get('receipt') as File
    
    if (!file) {
      return NextResponse.json({ error: 'Tidak ada file struk yang diunggah' }, { status: 400 })
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

    // 1. Convert File to Base64 (GenerativePart)
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64Data = buffer.toString('base64')
    
    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: file.type || 'image/jpeg'
      },
    }

    // 2. Setup Gemini Model & Prompt
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })
    
    const prompt = `
      Kamu adalah akuntan ahli dan sistem ekstraksi data yang sangat presisi. 
      Tugasmu adalah menganalisis gambar struk/nota/faktur belanja ini dan mengekstrak informasi penting ke dalam format JSON.
      
      Aturan ketat:
      1. Hanya kembalikan output dalam bentuk JSON murni tanpa markdown \`\`\`json.
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

    // 3. Call Gemini API
    const result = await model.generateContent([prompt, imagePart])
    const response = await result.response
    const textOutput = response.text()

    // 4. Parse JSON Output
    let parsedData
    try {
      // Bersihkan jika gemini kadang masih mengembalikan markdown
      const cleanedText = textOutput.replace(/```json/g, '').replace(/```/g, '').trim()
      parsedData = JSON.parse(cleanedText)
    } catch (parseErr) {
      console.error('Failed to parse Gemini output:', textOutput, parseErr)
      return NextResponse.json({ error: 'AI gagal membaca struk dengan baik' }, { status: 500 })
    }

    if (!parsedData.success) {
      return NextResponse.json({ error: 'Gambar tidak dikenali sebagai struk yang sah' }, { status: 400 })
    }

    // 5. Simpan ke tabel receipts di Supabase (sebagai history/log)
    // Catatan: idealnya gambar juga di-upload ke Supabase Storage. 
    // Untuk MVP kita simpan raw text/data saja dengan image_url placeholder.
    
    const { data: receiptRow, error: insertError } = await supabase
      .from('receipts')
      .insert({
        user_id: user.id,
        image_url: 'placeholder_for_storage', // Todo: integrasi Supabase Storage
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
