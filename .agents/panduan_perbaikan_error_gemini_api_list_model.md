# Panduan Perbaikan Error 404 Gemini API & Daftar Model AI Google

Dokumen ini berisi solusi langkah-demi-langkah untuk mengatasi error `404 Not Found` pada Gemini API serta daftar lengkap model AI Gemini yang dapat digunakan dalam proyek software Anda.

---

## 1. Penyebab Utama Error 404 (`models/gemini-1.5-pro is not found`)

Error 404 saat memanggil API Gemini biasanya disebabkan oleh salah satu dari 4 faktor utama berikut:

1. **Format Model String Duplikat (Prefix Redundancy)**  
   SDK Google Generative AI secara otomatis menambahkan awalan `models/` pada endpoint. Jika Anda menulis `getGenerativeModel({ model: "models/gemini-1.5-pro" })`, request akan menjadi `models/models/gemini-1.5-pro` yang mengakibatkan 404 Not Found.
2. **SDK / Dependensi Outdated**  
   Versi SDK lama (seperti `@google/generative-ai` versi lama) sering kali mengarahkan request ke URL `v1beta` yang sudah dipindahkan atau terdepresiasi.
3. **Jenis API Key Tidak Sesuai**  
   API key yang dibuat di Google Cloud Console (Service Account) tanpa mengaktifkan *Generative Language API* sering kali tidak bisa mengakses endpoint AI Studio, atau sebaliknya.
4. **Nama Alias Model Tidak Didukung**  
   Menggunakan nama model yang tidak resmi seperti `gemini-1.5-pro-latest` atau versi yang sudah dipensiunkan.

---

## 2. Langkah-Langkah Perbaikan (Troubleshooting & Fix)

### Langkah 1: Perbaiki String Nama Model di Kode Anda

Pastikan Anda **TIDAK** menyertakan awalan `models/` saat memanggil SDK.

**Node.js / JavaScript (SDK Terbaru `@google/genai`):**

```javascript
// ❌ SALAH (Menyebabkan Error 404)
const model = ai.getGenerativeModel({ model: "models/gemini-1.5-pro" });

// ✅ BENAR
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const response = await ai.models.generateContent({
  model: "gemini-1.5-pro", // atau "gemini-2.5-flash" / "gemini-1.5-flash"
  contents: "Halo, jelaskan tentang proyek ini.",
});

console.log(response.text);
```

**Python (`google-genai` SDK resmi):**

```python
# ❌ SALAH
response = client.models.generate_content(
    model="models/gemini-1.5-pro",
    contents="Halo"
)

# ✅ BENAR
from google import genai

client = genai.Client(api_key="YOUR_API_KEY")

response = client.models.generate_content(
    model="gemini-1.5-pro",
    contents="Halo, jelaskan tentang proyek ini."
)
print(response.text)
```

---

### Langkah 2: Update SDK ke Versi Terbaru

Perbarui SDK Generative AI di proyek Anda untuk memastikan kompatibilitas endpoint URL:

* **Node.js:**
  ```bash
  npm install @google/genai@latest
  ```
* **Python:**
  ```bash
  pip install --upgrade google-genai
  ```

---

### Langkah 3: Verifikasi API Key dari Google AI Studio

1. Buka [Google AI Studio](https://aistudio.google.com/).
2. Buat API Key baru dari menu **Get API key**.
3. Pastikan API key tersebut digunakan dalam *environment variable* proyek Anda (`GEMINI_API_KEY`).

---

## 3. Daftar Model AI Gemini yang Bisa Dipakai dalam Proyek

Berikut adalah daftar model Google Gemini aktif yang didukung untuk pembuatan konten (`generateContent`), pemrosesan multimodal, serta pencarian embeddings:

### A. Flash Models (Cepat, Efisien, Hemat Biaya)

Model lini *Flash* dirancang untuk kecepatan tinggi, latensi rendah, dan penanganan volume request besar dengan biaya minimal.

| API Model ID (String Kode) | Deskripsi & Kegunaan Utama | Context Window |
| :--- | :--- | :--- |
| `gemini-2.5-flash` | **Rekomendasi Utama**. Sangat cepat, efisien, cocok untuk mayoritas aplikasi web/mobile. | 1.000.000 token |
| `gemini-3.5-flash` | Generasi Flash terbaru untuk penalaran agen, tugas kompleks, dan eksekusi cepat. | 1.000.000 token |
| `gemini-1.5-flash` | Versi stabil hemat biaya untuk inferensi cepat dan ringkasan dokumen. | 1.000.000 token |
| `gemini-3.5-flash-lite` | Model super murah dan ringan untuk klasifikasi, ekstraksi data, dan otomatisasi skala besar. | 1.000.000 token |

### B. Pro Models (Penalaran Tinggi & Tugas Kompleks)

Model lini *Pro* sangat unggul dalam coding kompleks, penalaran multi-langkah (*deep reasoning*), analisis dokumen panjang, serta pengerjaan logika rumit.

| API Model ID (String Kode) | Deskripsi & Kegunaan Utama | Context Window |
| :--- | :--- | :--- |
| `gemini-2.5-pro` | Stabil untuk pemrosesan logika bisnis, analisis kode teknis, dan manipulasi data besar. | 1.000.000 token |
| `gemini-1.5-pro` | Model resolusi tinggi untuk analisis berkas audio, video panjang, dan dokumen PDF tebal. | 1.000.000 token |
| `gemini-3.1-pro-preview` | Model penalaran flagship terbaru untuk coding tingkat tinggi dan sistem berbasis agen (*AI Agents*). | 1.000.000 token |

### C. Model Khusus (Embedding, Gambar, Audio)

| API Model ID (String Kode) | Tipe | Fungsi Utama |
| :--- | :--- | :--- |
| `text-embedding-004` | Embedding | Vektor pencarian (RAG / Semantic Search) |
| `imagen-3.0-generate-002` | Image Gen | Generasi gambar realistis dari prompt teks |
| `gemini-2.5-flash-live-preview` | Live / Audio | Interaksi percakapan suara real-time dengan latensi rendah |

---

## 4. Cara Mengecek Daftar Model Aktif via Script (Dynamic Check)

Jika Anda ingin melihat secara otomatis model apa saja yang bisa diakses oleh API Key Anda secara *real-time*, jalankan script berikut:

### Menggunakan cURL (Terminal / Command Prompt):
```bash
curl "https://generativelanguage.googleapis.com/v1beta/models?key=YOUR_API_KEY"
```

### Menggunakan Node.js Script:
```javascript
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function checkModels() {
  const models = await ai.models.list();
  for await (const model of models) {
    console.log(`Model ID: ${model.name} | Methods: ${model.supportedGenerationMethods}`);
  }
}

checkModels();
```

---

## Ringkasan Rekomendasi Pemilihan Model

1. **Untuk Aplikasi Umum / Web Service:** Gunakan `gemini-2.5-flash` atau `gemini-1.5-flash`.
2. **Untuk Analisis Kode & Logika Berpikir Rumit:** Gunakan `gemini-2.5-pro` atau `gemini-1.5-pro`.
3. **Untuk RAG / Vector Database:** Gunakan `text-embedding-004`.