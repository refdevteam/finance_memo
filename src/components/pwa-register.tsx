'use client'

import { useEffect } from 'react'
import { initAnalytics } from '@/lib/firebase/analytics'

export function PwaRegister() {
  useEffect(() => {
    // Initialize Firebase / Google Analytics
    initAnalytics()

    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/firebase-messaging-sw.js')
          .then((reg) => {
            console.log('PWA Service Worker registered with scope: ', reg.scope)
          })
          .catch((err) => {
            console.error('PWA Service Worker registration failed: ', err)
          })
      })
    }
  }, [])

  return null
}
