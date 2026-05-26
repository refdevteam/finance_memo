import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const hasGroq = !!process.env.GROQ_API_KEY
    const hasGemini = !!process.env.GEMINI_API_KEY

    if (!hasGroq && !hasGemini) {
      return NextResponse.json({ error: 'API Key untuk AI (Groq atau Gemini) belum dikonfigurasi' }, { status: 500 })
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

    if (hasGroq) {
      // ==== MENGGUNAKAN GROQ (100% GRATIS & SUPER CEPAT DENGAN LLAMA 3.2 VISION) ====
      try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "llama-3.2-11b-vision-preview",
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: prompt,
                  },
                  {
                    type: "image_url",
                    image_url: {
                      url: `data:${file.type || "image/jpeg"};base64,${base64Data}`,
                    },
                  },
                ],
              },
            ],
            response_format: { type: "json_object" }, // Memaksa Groq mengembalikan JSON valid
            temperature: 0.1,
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
        console.error('Groq scan failed:', groqErr)
        throw groqErr
      }
    } else {
      // ==== BACKFALL: MENGGUNAKAN GEMINI ====
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })

      const imagePart = {
        inlineData: {
          data: base64Data,
          mimeType: file.type || 'image/jpeg'
        },
      }

      const result = await model.generateContent([prompt, imagePart])
      const response = await result.response
      const textOutput = response.text()

      // Bersihkan jika gemini kadang masih mengembalikan markdown
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

