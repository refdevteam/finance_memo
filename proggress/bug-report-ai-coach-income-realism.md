# Bug Report: Ketidakakuratan Analisis Defisit & Skor AI Coach (Harian & Mingguan)

**Project:** Finance Memo  
**File:** `ai-coach.ts`  
**Status:** 🟡 Warning — Hasil ulasan AI kurang realistis/akurat  
**Reporter:** Product Feedback / QA

---

## Ringkasan Masalah

1. **Ulasan Defisit Palsu:** Pengguna mendapatkan analisis dari Fimo AI Coach yang menyatakan mereka mengalami "defisit pengeluaran melebihi pemasukan" pada laporan Harian (`daily`) dan Mingguan (`weekly`), padahal keuangan mereka sebenarnya stabil.
2. **Skor Kesehatan Finansial Rendah:** Skor kesehatan finansial pengguna drop secara drastis di bawah 50 pada laporan harian/mingguan tanpa alasan yang objektif.
3. **Penyebab Utama:** Mayoritas pengguna menerima pendapatan (gaji) sekali sebulan (misal tanggal 25). Karena analisis harian hanya mengambil data 2 hari terakhir dan mingguan hanya mengambil data 7 hari terakhir, variabel `income` (pemasukan) yang dikirim ke AI hampir selalu bernilai `0`. AI kemudian membandingkan pengeluaran riil (misal Rp50.000) dengan pemasukan `0` tersebut dan langsung menyimpulkan terjadi defisit parah.

---

## Root Cause

### 1. Rentang Lookback Transaksi Pemasukan Terlalu Sempit
Dalam `getAICoachInsight` di `ai-coach.ts`, variabel `startDate` diatur dinamis untuk menyaring daftar transaksi:
- `daily`: 2 hari terakhir.
- `weekly`: 7 hari terakhir.

Data pemasukan dan pengeluaran dihitung murni dari hasil filter rentang pendek ini:
```typescript
const trxs = transactions || []
const income = trxs.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
const expense = trxs.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
```
Ketika rentang tersebut tidak mencakup tanggal gajian pengguna, nilai `income` akan menjadi `0`.

### 2. Aturan Prompt AI Memaksakan Defisit Berdasarkan Pemasukan Jangka Pendek
Aturan prompt pada `daily` dan `weekly` memaksa AI untuk memberikan skor rendah jika pengeluaran melampaui pemasukan:
- **Daily:** `Jika Pengeluaran > Pemasukan (defisit), skor harus di bawah 50.`
- **Weekly:** `Jika Pengeluaran > Pemasukan secara keseluruhan (defisit mingguan), skor harus di bawah 50.`

Hal ini tidak realistis untuk pengelolaan keuangan bulanan, karena pengeluaran harian/mingguan sewajarnya dibiayai oleh sisa saldo bulanan/gaji bulanan sebelumnya, bukan dari pemasukan baru di hari tersebut.

---

## Proposed Fix (Solusi)

### Fix 1 — Ambil Data Referensi Pemasukan 30 Hari Terakhir
Kita akan menambahkan query Supabase terpisah untuk menghitung total pemasukan pengguna selama 30 hari ke belakang (`income30Days`) sebagai data referensi/konteks bulanan yang akurat bagi AI:

```typescript
// Ambil total pemasukan 30 hari terakhir sebagai context/baseline bulanan
const thirtyDaysAgo = new Date()
thirtyDaysAgo.setDate(now.getDate() - 29)
const startDate30Days = toYYYYMMDD(thirtyDaysAgo)

const { data: income30DaysData } = await supabase
  .from('transactions')
  .select('amount')
  .eq('user_id', user.id)
  .eq('type', 'income')
  .gte('transaction_date', startDate30Days)
  .lte('transaction_date', toYYYYMMDD(now))

const income30Days = (income30DaysData || []).reduce((s, t) => s + Number(t.amount), 0)
```

### Fix 2 — Modifikasi Prompt AI untuk Analisis yang Lebih Realistis
Kita akan menyertakan data `income30Days` ke dalam prompt harian/mingguan sebagai `Referensi Pemasukan (30 Hari Terakhir)` dan memperbarui aturannya:
1. **Perbandingan Pengeluaran:** AI diinstruksikan untuk membandingkan pengeluaran periode berjalan (2 hari atau 7 hari) terhadap referensi pemasukan 30 hari terakhir.
2. **Aturan Belanja Sehat:**
   - Pengeluaran harian dianggap sehat jika maksimal 3-5% dari pemasukan bulanan.
   - Pengeluaran mingguan dianggap sehat jika maksimal 20-25% dari pemasukan bulanan.
3. **Mencegah Klaim Defisit Salah:** AI dilarang keras mengklaim terjadi defisit hanya karena total pemasukan jangka pendek (2 hari / 7 hari) bernilai 0, asalkan referensi pemasukan 30 hari terakhir pengguna mencukupi untuk meng-cover belanja tersebut.

---

## Implementasi Prompt Baru (Rencana Perubahan)

### Prompt Harian (Daily) Baru:
```typescript
Data Keuangan Pengguna (2 Hari Terakhir):
- Streak Mencatat: ${userStreak} Hari berturut-turut
- Total Pemasukan (2 Hari Terakhir): ${currency} ${income.toLocaleString('id-ID')}
- Total Pengeluaran (2 Hari Terakhir): ${currency} ${expense.toLocaleString('id-ID')}
- Referensi Pemasukan (30 Hari Terakhir): ${currency} ${income30Days.toLocaleString('id-ID')}
- Kategori Belanja & Nominal:
${expenseCategories || 'Tidak ada belanja dalam 2 hari terakhir.'}

Aturan Penilaian & Output:
...
3. Aturan Skor Kesehatan Keuangan Harian (Tingkat Realistis Tinggi):
   - Jangan anggap pengguna mengalami defisit hanya karena pemasukan 2 hari terakhir bernilai 0. Bandingkan pengeluaran 2 hari terakhir terhadap Referensi Pemasukan (30 Hari Terakhir). Pengeluaran harian wajar adalah maksimal 3-5% dari referensi pemasukan 30 hari terakhir.
   - Jika tidak ada transaksi sama sekali dalam 2 hari terakhir (Pemasukan = 0 dan Pengeluaran = 0), skor WAJIB bernilai 0.
   - Jika total pengeluaran 2 hari terakhir melebihi 20% dari referensi pemasukan 30 hari terakhir, berikan skor di bawah 55 (indikasi pemborosan mendadak).
```

### Prompt Mingguan (Weekly) Baru:
```typescript
Data Keuangan Pengguna (7 Hari Terakhir):
- Streak Mencatat: ${userStreak} Hari berturut-turut
- Total Pemasukan (7 Hari Terakhir): ${currency} ${income.toLocaleString('id-ID')}
- Total Pengeluaran (7 Hari Terakhir): ${currency} ${expense.toLocaleString('id-ID')}
- Referensi Pemasukan (30 Hari Terakhir): ${currency} ${income30Days.toLocaleString('id-ID')}
- Kategori Belanja & Nominal:
${expenseCategories || 'Tidak ada belanja dalam 7 hari terakhir.'}

Aturan Penilaian & Output:
...
3. Aturan Skor Kesehatan Keuangan Mingguan (Tingkat Realistis Tinggi):
   - Jangan anggap pengguna mengalami defisit hanya karena pemasukan 7 hari terakhir bernilai 0. Bandingkan pengeluaran 7 hari terakhir terhadap Referensi Pemasukan (30 Hari Terakhir). Pengeluaran mingguan sehat adalah maksimal 20-25% dari referensi pemasukan 30 hari terakhir.
   - Jika tidak ada transaksi sama sekali dalam 7 hari terakhir (Pemasukan = 0 dan Pengeluaran = 0), skor WAJIB bernilai 0.
   - Jika total pengeluaran 7 hari terakhir melebihi 30% dari referensi pemasukan 30 hari terakhir, berikan skor di bawah 50.
```

---

## Ringkasan per Perspektif

| Role | Temuan & Kontribusi |
|------|---------------------|
| **Dev** | Menambahkan perhitungan database `income30Days` dan menyertakannya di parameter prompt untuk memberikan konteks jangka panjang yang akurat. |
| **QA** | Memverifikasi skor kesehatan finansial harian/mingguan tidak drop secara drastis saat pemasukan jangka pendek bernilai 0 tapi bulanan memadai. |
| **PM / UX** | Laporan Fimo AI menjadi jauh lebih realistis, tidak menyalahkan pengguna dengan klaim defisit palsu, dan memberikan tips taktis yang relevan berdasarkan rasio belanja bulanan. |

---
*Generated from code review — Fimo Project*
