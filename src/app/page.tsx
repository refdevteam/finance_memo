import { redirect } from 'next/navigation'

// Jangan biarkan halaman ini di-prerender statis. Pada Next 14, `redirect()`
// di halaman statis hanya disimpan sebagai digest di payload RSC sehingga
// respons HTTP-nya menjadi `307` TANPA header `Location` (lihat
// .next/server/app/index.meta). Crawler dan klien tanpa JS akan melihat
// halaman error kosong. Dengan dynamic, redirect dieksekusi saat request
// dan mengirim `307` + `Location` yang sah.
export const dynamic = 'force-dynamic'

export default function Home() {
  redirect('/dashboard')
}
