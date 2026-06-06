import { redirect } from 'next/navigation'
import fs from 'fs'

// Temporary self-executing logo copy logic
try {
  const src = 'C:\\Users\\User\\.gemini\\antigravity-ide\\brain\\1af170df-ccb2-4f2c-be03-246aa17a635c\\fimo_logo_1780710969362.png'
  const dest512 = 'd:\\Data\\My SSD\\Documents\\My-Project\\fimo\\finance_memo\\public\\icon-512.png'
  const dest192 = 'd:\\Data\\My SSD\\Documents\\My-Project\\fimo\\finance_memo\\public\\icon-192.png'
  
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest512)
    fs.copyFileSync(src, dest192)
    console.log('--- LOGO COPIED SUCCESSFULLY VIA NEXT.JS ---')
  } else {
    console.log('--- LOGO SRC NOT FOUND ---')
  }
} catch (err) {
  console.error('--- LOGO COPY ERROR IN NEXT.JS ---', err)
}

export default function Home() {
  redirect('/dashboard')
}
