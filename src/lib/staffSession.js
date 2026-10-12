import { supabase } from './supabase'

// The PIN session of whoever is working on this café terminal right now.
// Kept in sessionStorage: survives a page reload, gone when the browser tab closes.
const KEY = 'igu-staff-session'
const LOCK_EVENT = 'igu-staff-locked'

export function getStaffSession() {
  try {
    return sessionStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function saveStaffSession(session) {
  try {
    sessionStorage.setItem(KEY, session)
  } catch {
    // private mode: the session just won't survive a reload
  }
}

export function clearStaffSession() {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    // nothing to clear
  }
}

// Tells the app to show the PIN screen again
export function lockTerminal() {
  clearStaffSession()
  window.dispatchEvent(new Event(LOCK_EVENT))
}

export function onTerminalLocked(callback) {
  window.addEventListener(LOCK_EVENT, callback)
  return () => window.removeEventListener(LOCK_EVENT, callback)
}

// Calls a staff action and sends the PIN session with it.
// If the session ran out, the terminal locks and asks for a PIN.
// Without a PIN session (the manager's own account) nothing extra is sent,
// so this also works before database/12_staff_pins.sql has been run.
export async function staffRpc(name, args) {
  const session = getStaffSession()
  const result = await supabase.rpc(name, session ? { ...args, p_session: session } : args)
  if (result.error?.message === 'PIN_REQUIRED') lockTerminal()
  return result
}
