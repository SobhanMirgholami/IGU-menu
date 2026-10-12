// Installable app + "order ready" notifications.
//
// Two ways a notification arrives:
//  1. App open or in the background: MyOrders sees the change live and shows it (notifyOrderReady).
//  2. App closed: Web Push. The staff screen calls the notify-order-ready Edge Function,
//     which sends a push to the addresses saved by subscribeToPush(), and sw.js shows it.
// Both use the same tag, so the student never gets the same notification twice.
import { supabase } from './supabase'

// Public half of the Web Push key pair (safe to publish).
// The private half lives only in Supabase secrets (see push-keys.local, never committed).
const VAPID_PUBLIC_KEY = 'BPaPR2koXBcXTQ9puec9X9JByUPt9JoABq2E68W7M1yh4zl97bTL3yiZVNEQSskeO_AzaIDhoJkwuPFiml_ggR0'

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

// ---------- Web Push (works even when the app is closed) ----------

function keyToBytes(base64url) {
  const base64 = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
}

export const pushSupported = () => notificationsSupported() && 'PushManager' in window

// Ask the phone for a push address and save it for this student.
// Call only after notification permission is granted. Never throws.
export async function subscribeToPush(lang) {
  if (!pushSupported() || Notification.permission !== 'granted') return false
  try {
    const registration = await navigator.serviceWorker.getRegistration()
    if (!registration) return false // no service worker in dev mode

    const subscription =
      (await registration.pushManager.getSubscription()) ||
      (await registration.pushManager.subscribe({
        userVisibleOnly: true, // every push must show a notification (browsers require it)
        applicationServerKey: keyToBytes(VAPID_PUBLIC_KEY),
      }))

    const { keys } = subscription.toJSON()
    const { error } = await supabase.rpc('save_push_subscription', {
      p_endpoint: subscription.endpoint,
      p_p256dh: keys.p256dh,
      p_auth: keys.auth,
      p_lang: lang,
    })
    return !error
  } catch {
    return false
  }
}

// On sign out: this phone should stop getting the previous student's notifications
export async function unsubscribePush() {
  try {
    const registration = await navigator.serviceWorker?.getRegistration()
    const subscription = await registration?.pushManager.getSubscription()
    if (!subscription) return
    await supabase.rpc('delete_push_subscription', { p_endpoint: subscription.endpoint })
    await subscription.unsubscribe()
  } catch {
    // signing out still works
  }
}
