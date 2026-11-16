import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { GoogleGenAI } from "@google/genai"

const MAX_BYTES = 5 * 1024 * 1024
const SCAN_LIMIT = 20

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"]
const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/pdf": "pdf",
}

/**
 * Deteksi tipe file dari magic bytes-nya sendiri.
 *
 * `file.type` berasal dari header Content-Type yang dikirim klien dan bisa
 * dipalsukan begitu saja. Bucket storage pun hanya memvalidasi Content-Type,
 * jadi tanpa pemeriksaan ini seseorang bisa menaruh konten apa pun (mis. HTML
 * atau biner berbahaya) di domain Anda dengan menyebutnya "image/png".
 *
 * Mengembalikan null bila tidak dikenali.
 */
function detectMime(buf: Buffer): string | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return "image/jpeg" // FF D8 FF
  }
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return "image/png" // 89 50 4E 47 0D 0A 1A 0A
  }
  if (
    buf.length >= 12 &&
    buf.toString("latin1", 0, 4) === "RIFF" &&
    buf.toString("latin1", 8, 12) === "WEBP"
  ) {
    return "image/webp" // RIFF....WEBP
  }
  if (buf.length >= 4 && buf.toString("latin1", 0, 4) === "GIF8") {
    return "image/gif" // GIF87a / GIF89a
  }
  if (buf.length >= 4 && buf.toString("latin1", 0, 4) === "%PDF") {
    return "application/pdf"
  }
  return null
}

export async function POST(req: NextRequest) {
  let supabase: ReturnType<typeof createClient> | null = null
  let uploadedPath: string | null = null

  try {
    supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY diperlukan untuk fitur Scan Struk." },
        { status: 500 }
      )
    }

    const formData = await req.formData()
    const file = formData.get("receipt") as File

    if (!file) {
      return NextResponse.json({ error: "Tidak ada file struk yang diunggah" }, { status: 400 })
    }

    // --- 1. Validasi ukuran -------------------------------------------------
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "Ukuran file terlalu besar. Maksimal adalah 5MB." },
        { status: 400 }
      )
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer())

    // --- 2. Validasi isi file (magic bytes) ---------------------------------
    // Dilakukan SEBELUM kuota dan SEBELUM upload: murah, tidak memanggil LLM,
    // dan tidak mengotori storage.
    const detectedMime = detectMime(fileBuffer)
    if (!detectedMime || !ALLOWED_MIME.includes(detectedMime)) {
      return NextResponse.json(
        { error: "Format file tidak didukung. Silakan unggah gambar (JPEG, PNG, WebP, GIF) atau PDF." },
        { status: 400 }
      )
    }
    // Isi file harus konsisten dengan deklarasi klien (atau deklarasinya diabaikan).
    if (file.type && file.type !== detectedMime) {
      console.warn(`[scan-receipt] MIME tidak cocok: deklarasi=${file.type} isi=${detectedMime}`)
    }

    // --- 3. Rate limit: hitung PERCOBAAN, secara atomik ----------------------
    // Sebelumnya kuota dihitung dari baris `receipts`, padahal baris itu hanya
    // tercipta setelah Gemini sukses. Gambar yang bukan struk membuat Gemini
    // tetap dipanggil lalu ditolak TANPA baris tersimpan -> kuota tidak pernah
    // berkurang -> biaya Gemini bisa diboroskan tanpa batas.
    //
    // `consume_scan_quota` melakukan SATU UPDATE dengan klausa WHERE, jadi
    // beberapa request bersamaan tidak bisa sama-sama lolos (celah TOCTOU).
    const quotaOk = await consumeQuota(supabase, user.id)
    if (!quotaOk) {
      return NextResponse.json(
        { error: `Batas harian pemindaian struk (${SCAN_LIMIT}/hari) telah habis. Silakan coba lagi besok.` },
        { status: 429 }
      )
    }

    // --- 4. Upload ke storage (tipe diambil dari isi file, bukan dari klien) --
    const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${EXT_BY_MIME[detectedMime]}`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("receipts")
      .upload(fileName, fileBuffer, {
        contentType: detectedMime,
        upsert: false,
      })

    if (uploadError || !uploadData) {
      console.error("Failed to upload receipt to storage:", uploadError)
      return NextResponse.json({ error: "Gagal mengunggah file struk" }, { status: 500 })
    }
    uploadedPath = uploadData.path

    // Bucket `receipts` berstatus privat, jadi getPublicUrl() menghasilkan URL
    // yang tidak bisa diakses. Kolom image_url saat ini memang tidak pernah
    // dibaca oleh aplikasi mana pun; disimpan sebagai path agar kelak bisa
    // ditandatangani saat dibutuhkan (createSignedUrl).
    const imageUrl = uploadData.path

    // --- 5. Panggil Gemini ---------------------------------------------------
    const base64Data = fileBuffer.toString("base64")

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

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: base64Data,
                mimeType: detectedMime,
              },
            },
          ],
        },
      ],
      config: { responseMimeType: "application/json" },
    })

    const textOutput = result.text ?? ""
    const cleanedText = textOutput.replace(/```json/g, "").replace(/```/g, "").trim()
    parsedData = JSON.parse(cleanedText)

    if (!parsedData || !parsedData.success) {
      // Bersihkan berkas yang sudah terlanjur diunggah supaya storage tidak
      // dipenuhi file gagal (bisa dipakai untuk menghabiskan kuota storage).
      await cleanupUpload(supabase, uploadedPath)
      uploadedPath = null
      return NextResponse.json(
        { error: "Gambar tidak dikenali sebagai struk yang sah" },
        { status: 400 }
      )
    }

    // --- 6. Simpan baris receipts -------------------------------------------
    const { data: receiptRow, error: insertError } = await supabase
      .from("receipts")
      .insert({
        user_id: user.id,
        image_url: imageUrl,
        merchant_name: parsedData.merchant_name,
        total_amount: parsedData.total_amount,
        receipt_date: parsedData.receipt_date,
        receipt_type: "purchase",
        ai_extracted: parsedData,
        is_processed: false,
      })
      .select("id")
      .single()

    if (insertError) {
      console.error("Failed to save receipt record:", insertError)
    }

    return NextResponse.json({
      data: parsedData,
      receipt_id: receiptRow?.id,
    })
  } catch (error) {
    console.error("Scan receipt error:", error)
    // Rapikan file yang terlanjur terunggah sebelum kegagalan.
    if (supabase) {
      try {
        await cleanupUpload(supabase, uploadedPath)
      } catch {
        /* diabaikan */
      }
    }
    // Jangan teruskan pesan error mentah (bisa memuat detail internal
    // konfigurasi/LLM) ke klien.
    return NextResponse.json(
      { error: "Gagal memproses struk. Silakan coba lagi." },
      { status: 500 }
    )
  }
}

/**
 * Ambil satu kuota scan secara atomik.
 *
 * Mengembalikan false bila kuota hari ini sudah habis. Bila RPC
 * `consume_scan_quota` belum ada (migration belum dijalankan), jatuh ke
 * pembacaan-lalu-update supaya fitur tetap berfungsi meski tanpa atomisitas.
 */
async function consumeQuota(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc("consume_scan_quota", { p_limit: SCAN_LIMIT })
  if (!error && typeof data === "boolean") {
    return data
  }

  // --- fallback: tidak atomik, dipakai hanya sampai migration diterapkan ---
  if (error) console.warn("[scan-receipt] RPC consume_scan_quota belum tersedia, pakai fallback:", error.message)

  const today = new Date().toISOString().split("T")[0]

  const { data: profileRow, error: profileErr } = await supabase
    .from("profiles")
    .select("scan_count, scan_date")
    .eq("id", userId)
    .maybeSingle()

  let used = 0
  if (profileErr) {
    // Kolom migration juga belum ada -> mundur ke penghitungan receipts.
    const { count, error: countError } = await supabase
      .from("receipts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("scanned_at", `${today}T00:00:00Z`)
    if (countError) throw countError
    used = count ?? 0
    if (used >= SCAN_LIMIT) return false
    return true
  }

  used = profileRow && profileRow.scan_date === today ? (profileRow.scan_count ?? 0) : 0
  if (used >= SCAN_LIMIT) return false

  const { error: quotaErr } = await supabase
    .from("profiles")
    .update({ scan_count: used + 1, scan_date: today })
    .eq("id", userId)
  if (quotaErr) console.error("Gagal mencatat kuota scan:", quotaErr)

  return true
}

async function cleanupUpload(
  supabase: ReturnType<typeof createClient>,
  path: string | null
): Promise<void> {
  if (!path) return
  const { error } = await supabase.storage.from("receipts").remove([path])
  if (error) console.warn("[scan-receipt] gagal membersihkan file gagal:", error.message)
}
