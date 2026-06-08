import { initializeApp, getApps, getApp } from 'firebase/app'
import { getMessaging, getToken } from 'firebase/messaging'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
}

// Inisialisasi Firebase App secara aman (singleton)
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()

// Fungsi untuk meminta FCM Token secara client-side
export async function getFirebaseToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null
  
  if (!('serviceWorker' in navigator)) {
    console.warn('[FCM] Service Worker tidak didukung di browser ini.')
    return null
  }

  try {
    const messaging = getMessaging(app)
    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    })
    return token
  } catch (error) {
    console.error('[FCM] Gagal mengambil token FCM dari Firebase SDK:', error)
    return null
  }
}
