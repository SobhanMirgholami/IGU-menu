// Must match current_terms_version() in database/14_terms.sql.
// Change both when the terms change, and everyone is asked to accept again.
export const TERMS_VERSION = '2026-10-13'

// Who runs the service and how to reach them.
// Fill in contactEmail once the café decides who answers privacy questions.
export const LEGAL = {
  controller: 'IGU Café',
  contactEmail: '',
}

// Ticked on the login screen before the account exists, saved to the database right after sign-in
const AGREED_KEY = 'igu-terms-agreed'

export function rememberAgreement() {
  try {
    sessionStorage.setItem(AGREED_KEY, TERMS_VERSION)
  } catch {
    // private mode: the student just ticks it once more after signing in
  }
}

export function takeAgreement() {
  try {
    const agreed = sessionStorage.getItem(AGREED_KEY) === TERMS_VERSION
    sessionStorage.removeItem(AGREED_KEY)
    return agreed
  } catch {
    return false
  }
}
