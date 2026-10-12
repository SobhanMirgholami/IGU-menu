// Installable app + "order ready" notifications.
//
// What works today: the notification appears while the app is open or running in the
// background (phone locked, other app on screen). If the app is fully closed, it can't
// fire yet. That needs Web Push from a server, which is a later step.

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // the app works fine without it, just not installable/offline
    })
  })
}

// ---------- Install button ----------

let deferredPrompt = null
const listeners = new Set()

if (typeof window !== 'undefined') {
  // Chrome / Edge / Android: the browser offers its own install dialog
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt = e
    listeners.forEach((fn) => fn())
  })
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    listeners.forEach((fn) => fn())
  })
}

export const isInstalled = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true

// iPhone/iPad Safari has no install dialog: people use Share -> Add to Home Screen
export const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent)

export const canPromptInstall = () => deferredPrompt !== null

export function onInstallChange(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export async function promptInstall() {
  if (!deferredPrompt) return false
  deferredPrompt.prompt()
  const { outcome } = await deferredPrompt.userChoice
  deferredPrompt = null
  listeners.forEach((fn) => fn())
  return outcome === 'accepted'
}

// ---------- Notifications ----------

export const notificationsSupported = () => 'Notification' in window && 'serviceWorker' in navigator

export const notificationsAllowed = () => notificationsSupported() && Notification.permission === 'granted'

// Must be called from a tap (browsers ignore it otherwise)
export async function askForNotifications() {
  if (!notificationsSupported()) return 'unsupported'
  if (Notification.permission !== 'default') return Notification.permission
  return Notification.requestPermission()
}

export async function notifyOrderReady(orderId, { title, body }) {
  navigator.vibrate?.([200, 100, 200])
  if (!notificationsAllowed()) return

  try {
    const registration = await navigator.serviceWorker.getRegistration()
    const options = {
      body,
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-96.png',
      tag: `order-${orderId}`, // one notification per order, never duplicates
      renotify: true,
      vibrate: [200, 100, 200],
    }
    if (registration) await registration.showNotification(title, options)
    else new Notification(title, options)
  } catch {
    // notifications blocked or not available: the big ready ticket still shows
  }
}
