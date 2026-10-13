import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { TERMS_VERSION, rememberOnThisDevice, takeAgreement } from '../lib/legal'

// No screen here: the student already read and accepted the terms on the login page,
// before the code was sent. This just saves that acceptance once the account exists,
// and lets this phone remember it so returning students skip the checkbox.
export default function TermsGate({ children }) {
  const [saving, setSaving] = useState(true)

  useEffect(() => {
    let active = true

    async function sync() {
      if (takeAgreement()) {
        const { error } = await supabase.rpc('accept_terms', { p_version: TERMS_VERSION })
        if (!error) rememberOnThisDevice()
      } else {
        // Accepted on another phone before? Remember it here too.
        const { data } = await supabase
          .from('terms_acceptances')
          .select('terms_version')
          .eq('terms_version', TERMS_VERSION)
          .maybeSingle()
        if (data) rememberOnThisDevice()
      }
      if (active) setSaving(false)
    }

    sync()
    return () => {
      active = false
    }
  }, [])

  // Wait for the save, so the cart doesn't ask a second time
  if (saving) return <p className="p-6 text-muted">...</p>
  return children
}
