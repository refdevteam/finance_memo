import { redirect } from 'next/navigation'
import fs from 'fs'

export default function Home() {
  redirect('/dashboard')
}
