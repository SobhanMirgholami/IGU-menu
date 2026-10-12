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
import AvailabilityPanel from './components/AvailabilityPanel'
import SalesReport from './components/SalesReport'
import CafeSettings from './components/CafeSettings'
import { ArrowIcon, LogoutIcon } from './components/icons'

const TABS = {
  staff: [
    { id: 'orders', label: 'Orders' },
    { id: 'availability', label: 'Sold out' },
  ],
  manager: [
    { id: 'orders', label: 'Orders' },
    { id: 'menu', label: 'Menu' },
    { id: 'reports', label: 'Reports' },
    { id: 'settings', label: 'Settings' },
  ],
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setChecking(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      if (!newSession) {
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
      </div>
    )
  }

  if (!role) return <p className="p-6 text-muted">...</p>

  const isStaff = role === 'staff' || role === 'manager'

  if (isStaff) {
    const tabs = TABS[role] ?? []

    return (
      <div className="min-h-screen bg-page text-fg p-6">
        <div className="max-w-3xl mx-auto flex flex-col gap-6">
          <header className="flex justify-between items-center gap-2">
            <h1 className="font-display font-extrabold text-3xl text-brand dark:text-pop">IGU Café</h1>
            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <ThemeToggle />
              <button
                onClick={() => supabase.auth.signOut()}
                aria-label={t('app.signOut')}
                className="w-11 h-11 rounded-full border-2 border-ink bg-white text-ink flex items-center justify-center"
              >
                <LogoutIcon size={18} className="rtl:rotate-180" />
              </button>
            </div>
          </header>

          <p className="text-sm text-muted">
            {t('app.signedInAs', { email: session.user.email })} ({role})
          </p>

          <nav className="flex flex-wrap gap-2">
            {tabs.map((tabItem) => (
              <button
                key={tabItem.id}
                onClick={() => setTab(tabItem.id)}
                className={`px-4 h-10 rounded-full border-2 font-bold text-sm ${
                  tab === tabItem.id
                    ? 'bg-ink text-white border-ink dark:bg-pop dark:text-ink dark:border-pop'
                    : 'bg-surface text-fg border-line'
                }`}
              >
                {tabItem.label}
              </button>
            ))}
          </nav>

          {tab === 'orders' && <StaffDashboard />}
          {tab === 'availability' && <AvailabilityPanel />}
          {tab === 'menu' && role === 'manager' && <ManagerMenu />}
          {tab === 'reports' && role === 'manager' && <SalesReport />}
          {tab === 'settings' && role === 'manager' && <CafeSettings />}
        </div>
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
      </main>

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