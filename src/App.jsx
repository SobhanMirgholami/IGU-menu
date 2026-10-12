import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from './lib/supabase'
import { formatPrice } from './lib/format'
import Login from './components/Login'
import Menu from './components/Menu'
import Cart from './components/Cart'
import MyOrders from './components/MyOrders'
import Hero from './components/Hero'
import PickupBanner from './components/PickupBanner'
import LanguageSwitcher from './components/LanguageSwitcher'
import ThemeToggle from './components/ThemeToggle'
import StaffDashboard from './components/StaffDashboard'
import ManagerMenu from './components/ManagerMenu'
import ManagerOptions from './components/ManagerOptions'
import AvailabilityPanel from './components/AvailabilityPanel'
import SalesReport from './components/SalesReport'
import CafeSettings from './components/CafeSettings'
import ManagerStaff from './components/ManagerStaff'
import PinLock from './components/PinLock'
import BugReports from './components/BugReports'
import Footer from './components/Footer'
import LegalPage from './components/LegalPage'
import { getStaffSession, clearStaffSession, lockTerminal, onTerminalLocked } from './lib/staffSession'
import { ArrowIcon, LogoutIcon } from './components/icons'

const TABS = {
  staff: ['orders', 'availability'],
  manager: ['orders', 'menu', 'options', 'staff', 'reports', 'settings', 'bugs'],
  developer: ['bugs'],
}

const IDLE_LOCK_MS = 30 * 60 * 1000 // same as the server's idle limit

const currentShift = () =>
  Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone: 'Europe/Istanbul' }).format(new Date())) < 15
    ? 'morning'
    : 'evening'

async function endStaffSession() {
  const session = getStaffSession()
  if (session) await supabase.rpc('staff_lock', { p_session: session })
  lockTerminal()
}

function nameFromEmail(email) {
  const first = email.split('@')[0].split(/[._-]/)[0]
  if (!first || /^\d/.test(first)) return null
  return first.charAt(0).toUpperCase() + first.slice(1)
}

function App() {
  const { t } = useTranslation()
  const [session, setSession] = useState(null)
  const [role, setRole] = useState(null)
  const [checking, setChecking] = useState(true)
  const [cart, setCart] = useState([])
  const [tab, setTab] = useState('orders')
  const [staffName, setStaffName] = useState(null) // who typed their PIN on the shared terminal
  const [staffChecked, setStaffChecked] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setChecking(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      if (!newSession) {
        clearStaffSession()
        setStaffName(null)
        setStaffChecked(false)
        setCart([])
        setRole(null)
        setTab('orders')
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) return

    async function loadRole() {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .maybeSingle()

      setRole(data?.role ?? 'student')
    }
    loadRole()
  }, [session])

  // Shared staff terminal: is a saved PIN session still alive?
  useEffect(() => {
    if (role !== 'staff') return
    const saved = getStaffSession()
    if (!saved) {
      setStaffChecked(true)
      return
    }
    supabase.rpc('staff_session_check', { p_session: saved }).then(({ data }) => {
      if (data?.ok) setStaffName(data.name)
      else clearStaffSession()
      setStaffChecked(true)
    })
  }, [role])

  // Back to the PIN screen when the session ends (switch person, or server says it expired)
  useEffect(() => onTerminalLocked(() => setStaffName(null)), [])

  // Lock after 30 minutes with no taps or key presses
  useEffect(() => {
    if (role !== 'staff' || !staffName) return
    let timer = setTimeout(endStaffSession, IDLE_LOCK_MS)
    const reset = () => {
      clearTimeout(timer)
      timer = setTimeout(endStaffSession, IDLE_LOCK_MS)
    }
    window.addEventListener('pointerdown', reset)
    window.addEventListener('keydown', reset)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('pointerdown', reset)
      window.removeEventListener('keydown', reset)
    }
  }, [role, staffName])

  function addToCart(item, options = []) {
    const optionIds = options.map((o) => o.id).sort((a, b) => a - b)
    const key = `${item.id}:${optionIds.join(',')}`
    const unitPrice =
      Number(item.price) + options.reduce((sum, o) => sum + Number(o.price_delta), 0)

    setCart((prev) => {
      const existing = prev.find((line) => line.key === key)
      if (existing) {
        if (existing.quantity >= 10) return prev
        return prev.map((line) =>
          line.key === key ? { ...line, quantity: line.quantity + 1 } : line
        )
      }
      return [
        ...prev,
        {
          key,
          menu_item_id: item.id,
          name: item.name,
          options: options.map((o) => ({ id: o.id, name: o.name })),
          unitPrice,
          quantity: 1,
        },
      ]
    })
  }

  if (checking) return null

  if (!session) {
    return (
      <div className="min-h-screen bg-page text-fg">
        <Hero signedIn={false} />
        <main className="max-w-md mx-auto px-5 py-6">
          <Login />
        </main>
        <Footer signedIn={false} page="login" />
        <LegalPage />
      </div>
    )
  }

  if (!role) return <p className="p-6 text-muted">...</p>

  const isStaff = role === 'staff' || role === 'manager' || role === 'developer'

  if (isStaff) {
    const tabs = TABS[role] ?? []
    const activeTab = tabs.includes(tab) ? tab : tabs[0] // each role opens on a tab it has
    const needsPin = role === 'staff' && !staffName
    if (role === 'staff' && !staffChecked) return <p className="p-6 text-muted">...</p>

    return (
      <div className="min-h-screen bg-page text-fg p-5 sm:p-8">
        <div className="max-w-4xl mx-auto flex flex-col gap-6">
          <header className="flex justify-between items-center gap-3 print:hidden">
            <div className="flex items-center gap-2">
              <h1 className="font-display font-extrabold text-3xl text-brand dark:text-pop">IGU Café</h1>
              <span aria-hidden="true" className="w-2.5 h-2.5 rounded-full bg-pop" />
            </div>
            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <ThemeToggle />
              <button
                onClick={async () => {
                  if (role === 'staff') await endStaffSession()
                  supabase.auth.signOut()
                }}
                aria-label={t('app.signOut')}
                className="w-11 h-11 rounded-full border-2 border-ink bg-white text-ink flex items-center justify-center"
              >
                <LogoutIcon size={18} className="rtl:rotate-180" />
              </button>
            </div>
          </header>

          {role === 'staff' && staffName ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] border-2 border-line bg-surface p-3 ps-4 print:hidden">
              <span className="flex items-center gap-3 font-bold">
                <span
                  aria-hidden="true"
                  className="w-9 h-9 rounded-full bg-pop text-ink font-extrabold flex items-center justify-center"
                >
                  {staffName.charAt(0).toUpperCase()}
                </span>
                <span>
                  {staffName}
                  <span className="block text-xs font-semibold text-muted">{t(`staff.pin.shift.${currentShift()}`)}</span>
                </span>
              </span>
              <button
                onClick={endStaffSession}
                className="h-10 px-4 rounded-full border-2 border-ink bg-pop text-ink font-bold text-sm shadow-hard-sm"
              >
                {t('staff.pin.switch')}
              </button>
            </div>
          ) : (
            <p className="text-sm text-muted print:hidden">
              {t('app.signedInAs', { email: session.user.email })} · {t(`staff.role.${role}`)}
            </p>
          )}

          {needsPin && <PinLock onUnlock={setStaffName} />}

          {!needsPin && (
          <nav className="flex flex-wrap gap-2 print:hidden">
            {tabs.map((tabId) => (
              <button
                key={tabId}
                onClick={() => setTab(tabId)}
                aria-pressed={activeTab === tabId}
                className={`px-4 h-11 rounded-full border-2 font-bold text-sm ${
                  activeTab === tabId
                    ? 'bg-ink text-white border-ink dark:bg-pop dark:text-ink dark:border-pop'
                    : 'bg-surface text-fg border-line'
                }`}
              >
                {t(`staff.tabs.${tabId}`)}
              </button>
            ))}
          </nav>
          )}

          {!needsPin && activeTab === 'orders' && <StaffDashboard />}
          {!needsPin && activeTab === 'availability' && <AvailabilityPanel />}
          {activeTab === 'menu' && role === 'manager' && <ManagerMenu />}
          {activeTab === 'options' && role === 'manager' && <ManagerOptions />}
          {activeTab === 'staff' && role === 'manager' && <ManagerStaff />}
          {activeTab === 'bugs' && <BugReports />}
          {activeTab === 'reports' && role === 'manager' && <SalesReport />}
          {activeTab === 'settings' && role === 'manager' && <CafeSettings />}
          <Footer signedIn page={`staff:${activeTab}`} />
        </div>
        <LegalPage />
      </div>
    )
  }

  const cartCount = cart.reduce((sum, line) => sum + line.quantity, 0)
  const cartTotal = cart.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0)

  return (
    <div className="min-h-screen bg-page text-fg pb-28">
      <Hero name={nameFromEmail(session.user.email)} signedIn>
        <PickupBanner />
      </Hero>

      <main className="max-w-md mx-auto px-5 pt-6 flex flex-col gap-6">
        <MyOrders />
        <Menu onAdd={addToCart} />
        <div id="cart">
          <Cart cart={cart} setCart={setCart} />
        </div>
        <Footer signedIn page="student" />
      </main>
      <LegalPage />

      {cartCount > 0 && (
        <button
          onClick={() => document.getElementById('cart')?.scrollIntoView({ behavior: 'smooth' })}
          className="fixed bottom-5 inset-x-4 max-w-md mx-auto h-16 rounded-[22px] bg-ink text-white flex items-center justify-between ps-3 pe-5 shadow-[4px_4px_0_var(--color-pop)] dark:border-2 dark:border-line"
        >
          <span className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-full bg-pop text-ink font-extrabold flex items-center justify-center">
              {cartCount}
            </span>
            <span className="font-bold">{t('home.viewOrder')}</span>
          </span>
          <span className="flex items-center gap-2 font-display font-bold text-lg">
            {formatPrice(cartTotal)}
            <ArrowIcon size={20} strokeWidth={2.4} className="rtl:rotate-180" />
          </span>
        </button>
      )}
    </div>
  )
}

export default App