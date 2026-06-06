'use client'

/**
 * Lightweight Firebase/Google Analytics Wrapper
 * Using gtag.js measurement protocol directly to keep bundle size minimal
 * and maintain 90+ Lighthouse performance score.
 */

declare global {
  interface Window {
    dataLayer: unknown[]
    gtag: (...args: unknown[]) => void
  }
}

export function initAnalytics() {
  if (typeof window === 'undefined') return

  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID

  if (!measurementId) {
    console.log('[Analytics] Firebase Analytics key missing, running in simulation mode.')
    return
  }

  // Load Google Analytics Script Tag
  const scriptId = 'ga-gtag-script'
  if (!document.getElementById(scriptId)) {
    const script = document.createElement('script')
    script.id = scriptId
    script.async = true
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`
    document.head.appendChild(script)

    window.dataLayer = window.dataLayer || []
    
    // eslint-disable-next-line prefer-rest-params
    window.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer.push(arguments)
    }
    
    window.gtag('js', new Date())
    window.gtag('config', measurementId, {
      page_path: window.location.pathname,
    })
    console.log('[Analytics] Firebase Analytics initialized successfully.')
  }
}

export function logAnalyticsEvent(eventName: string, params: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') return

  if (window.gtag) {
    window.gtag('event', eventName, params)
    console.log(`[Analytics] Event Logged: ${eventName}`, params)
  } else {
    console.log(`[Analytics Simulation] Event Logged: ${eventName}`, params)
  }
}
