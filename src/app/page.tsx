import { redirect } from 'next/navigation'

export default function Home() {
  // Langsung arahkan ke dashboard. 
  // Middleware akan menangani jika user belum login ke /auth/login
  redirect('/dashboard')
}
