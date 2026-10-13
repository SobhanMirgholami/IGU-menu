// Must match current_terms_version() in database/14_terms.sql.
// Change both when the terms change, and everyone is asked to accept again.
export const TERMS_VERSION = '2026-10-13'

// Who runs the service and how to reach them.
// Fill in contactEmail once the café decides who answers privacy questions.
export const LEGAL = {
  controller: 'IGU Café',
  contactEmail: '',
}

export const LEGAL_PAGES = ['terms', 'privacy']

const safe = (fn, fallback) => {
  try {
    return fn()
  } catch {
    return fallback // private mode or storage blocked
  }
}

// ---------- "Read to the end" (any one language counts) ----------

const READ_KEY = (page) => `igu-read-${page}-${TERMS_VERSION}`
const READ_EVENT = 'igu-legal-read'

export const hasRead = (page) => safe(() => sessionStorage.getItem(READ_KEY(page)) === '1', false)

export function markRead(page) {
  if (hasRead(page)) return
  safe(() => sessionStorage.setItem(READ_KEY(page), '1'))
  window.dispatchEvent(new Event(READ_EVENT))
}

export function onReadChange(fn) {
  window.addEventListener(READ_EVENT, fn)
  return () => window.removeEventListener(READ_EVENT, fn)
}

// ---------- Accepted on this phone (returning students skip the checkbox) ----------

const DEVICE_KEY = 'igu-terms-accepted'

export const acceptedOnThisDevice = () => safe(() => localStorage.getItem(DEVICE_KEY) === TERMS_VERSION, false)
export const rememberOnThisDevice = () => safe(() => localStorage.setItem(DEVICE_KEY, TERMS_VERSION))

// ---------- Ticked before the code is sent, saved to the database after sign-in ----------

const AGREED_KEY = 'igu-terms-agreed'

export function rememberAgreement() {
  safe(() => sessionStorage.setItem(AGREED_KEY, TERMS_VERSION))
}

export function takeAgreement() {
  return safe(() => {
    const agreed = sessionStorage.getItem(AGREED_KEY) === TERMS_VERSION
    sessionStorage.removeItem(AGREED_KEY)
    return agreed
  }, false)
}
