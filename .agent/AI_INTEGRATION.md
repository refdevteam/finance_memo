# AI_INTEGRATION.md

Panduan lengkap integrasi Claude AI untuk fitur scan struk dan klasifikasi keuangan.

---

## Model yang Digunakan

```
claude-sonnet-4-20250514
```

Dipilih karena kemampuan vision (image understanding) yang baik dengan latensi reasonable untuk UX real-time.

---

## Alur Scan Struk

```
1. User upload foto struk (JPEG/PNG/WEBP, max 10MB)
2. Frontend: preview + tombol "Scan dengan AI"
3. POST /api/ai/scan-receipt dengan FormData
4. Server:
   a. Validasi file type & size
   b. Upload ke Supabase Storage (bucket: receipts/{user_id}/{timestamp}.jpg)
   c. Convert ke base64 untuk Claude API
   d. Kirim ke Claude dengan prompt ekstraksi
   e. Parse JSON response
   f. Simpan ke tabel receipts (is_processed: false)
5. Return hasil ke client
6. Client: auto-fill form transaksi
7. User konfirmasi / edit → createTransaction()
8. Update receipts.is_processed = true
```

---

## Prompt Template

Semua prompt disimpan di `lib/ai/prompts.ts`:

```typescript
// lib/ai/prompts.ts

export const RECEIPT_EXTRACTION_PROMPT = `
Kamu adalah asisten keuangan yang ahli membaca struk/bukti transaksi.
Analisis gambar ini dan ekstrak informasi keuangan yang ada.

Berikan response HANYA dalam format JSON berikut (tanpa teks lain):
{
  "receipt_type": "purchase|payment|payslip|transfer|topup|bill|other",
  "merchant_name": "nama toko/perusahaan atau null",
  "date": "YYYY-MM-DD atau null",
  "time": "HH:MM atau null",
  "items": [
    { "name": "nama item", "qty": 1, "price": 0, "subtotal": 0 }
  ],
  "subtotal": 0,
  "tax": 0,
  "discount": 0,
  "total": 0,
  "payment_method": "cash|debit|credit|qris|transfer|ewallet|null",
  "currency": "IDR",
  "suggested_category": "nama kategori yang paling cocok",
  "confidence": 0.0,
  "notes": "catatan jika ada informasi penting lainnya atau null"
}

Aturan:
- Semua nilai angka dalam format integer (tanpa desimal) dalam IDR
- Jika informasi tidak ada di struk, gunakan null
- receipt_type:
  - purchase: struk belanja (minimarket, restoran, e-commerce)
  - payment: bukti pembayaran (tagihan listrik, PDAM, dll)
  - payslip: slip gaji
  - transfer: bukti transfer bank
  - topup: bukti top-up e-wallet
  - bill: tagihan kartu kredit/cicilan
  - other: jika tidak ada yang cocok
- suggested_category harus salah satu dari: Makan & Minum, Transport, Belanja, Tagihan, Kesehatan, Hiburan, Pendidikan, Cicilan, Tabungan, Gaji, Bonus, Freelance, Investasi, Lainnya
- confidence: 0.0–1.0, seberapa yakin kamu dengan hasil ekstraksi ini
`

export const INSIGHT_PROMPT = (
  totalExpense: number,
  topCategories: Array<{ name: string; amount: number }>,
  month: string
) => `
Berikan insight singkat (maks 3 kalimat, bahasa Indonesia yang ramah) tentang pola pengeluaran bulan ${month}:
- Total pengeluaran: Rp ${totalExpense.toLocaleString('id-ID')}
- Top kategori: ${topCategories.map(c => `${c.name} (Rp ${c.amount.toLocaleString('id-ID')})`).join(', ')}

Fokus pada 1 pola menarik dan 1 saran praktis yang bisa langsung diterapkan.
Jangan terlalu formal, gunakan bahasa yang mudah dipahami.
`
```

---

## Implementation: API Route

```typescript
// app/api/ai/scan-receipt/route.ts
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerClient } from '@/lib/supabase/server'
import { RECEIPT_EXTRACTION_PROMPT } from '@/lib/ai/prompts'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export async function POST(req: NextRequest) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('receipt') as File
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  // Validasi
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: 'Format file tidak didukung' }, { status: 400 })
  }
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'Ukuran file maksimal 10MB' }, { status: 400 })
  }

  // Upload ke Supabase Storage
  const filename = `${user.id}/${Date.now()}-${file.name}`
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('receipts')
    .upload(filename, file, { contentType: file.type })

  if (uploadError) {
    return NextResponse.json({ error: 'Gagal upload gambar' }, { status: 500 })
  }

  const { data: { publicUrl } } = supabase.storage
    .from('receipts')
    .getPublicUrl(filename)

  // Convert to base64
  const bytes = await file.arrayBuffer()
  const base64 = Buffer.from(bytes).toString('base64')

  // Call Claude API
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: file.type as 'image/jpeg' | 'image/png' | 'image/webp',
              data: base64,
            },
          },
          { type: 'text', text: RECEIPT_EXTRACTION_PROMPT },
        ],
      }],
    })

    const rawText = response.content[0].type === 'text' ? response.content[0].text : ''
    const extracted = JSON.parse(rawText)

    // Simpan ke receipts table
    const { data: receipt } = await supabase
      .from('receipts')
      .insert({
        user_id: user.id,
        image_url: publicUrl,
        merchant_name: extracted.merchant_name,
        total_amount: extracted.total,
        receipt_date: extracted.date,
        receipt_type: extracted.receipt_type,
        ai_extracted: extracted,
        is_processed: false,
      })
      .select()
      .single()

    return NextResponse.json({
      receipt_id: receipt?.id,
      extracted,
      image_url: publicUrl,
    })
  } catch (err) {
    console.error('[scan-receipt] Claude API error:', err)
    return NextResponse.json({ error: 'Gagal memproses struk' }, { status: 500 })
  }
}
```

---

## Tipe Struk yang Dikenali

| Tipe | Contoh | Kategori yang Disarankan |
|------|--------|--------------------------|
| `purchase` | Struk Indomaret, Alfamart, restoran, Tokopedia | Makan & Minum, Belanja |
| `payment` | Bukti bayar PLN, PDAM, internet | Tagihan |
| `payslip` | Slip gaji bulanan | Gaji |
| `transfer` | Bukti transfer BCA, Mandiri | (sesuai konteks) |
| `topup` | Struk top-up GoPay, OVO, Dana | (sesuai konteks) |
| `bill` | Tagihan kartu kredit, cicilan | Cicilan |
| `other` | Tidak teridentifikasi | Lainnya |

---

## Error Handling AI

```typescript
// lib/ai/scan-receipt.ts

export type ScanResult =
  | { success: true; data: ExtractedReceipt; receipt_id: string }
  | { success: false; error: string; fallback: 'manual_input' }

// Jika AI gagal atau confidence < 0.5, tampilkan form manual
// dengan pesan: "AI tidak yakin dengan hasil ekstraksi. Silakan isi manual."
if (extracted.confidence < 0.5) {
  return {
    success: false,
    error: 'Kualitas gambar kurang baik atau struk tidak terbaca',
    fallback: 'manual_input'
  }
}
```

---

## Rate Limiting

- Scan struk: max **10 request per user per jam** (implementasi via Supabase Edge Function atau middleware)
- Insight generation: max **3 request per user per hari**
- Tambahkan rate limit check di awal API route sebelum call ke Claude

---

## Biaya Estimasi (Claude API)

| Operasi | Token in | Token out | Cost/req (approx) |
|---------|----------|-----------|-------------------|
| Scan struk | ~1000 (image) | ~200 | ~$0.003 |
| Insight | ~300 | ~150 | ~$0.001 |

Estimasi untuk 100 scan/hari: ~$0.30/hari atau ~$9/bulan.
