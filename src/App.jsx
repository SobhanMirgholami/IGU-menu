import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import Login from './components/Login'
import Menu from './components/Menu'
import Cart from './components/Cart'
import MyOrders from './components/MyOrders'
import StaffDashboard from './components/StaffDashboard'
import ManagerMenu from './components/ManagerMenu'
import AvailabilityPanel from './components/AvailabilityPanel'
import SalesReport from './components/SalesReport'

const TABS = {
  staff: [
    { id: 'orders', label: 'Orders' },
    { id: 'availability', label: 'Sold out' },
  ],
  manager: [
    { id: 'orders', label: 'Orders' },
    { id: 'menu', label: 'Menu' },
    { id: 'reports', label: 'Reports' },
  ],
}

function App() {
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

  function addToCart(item) {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id)
      if (existing) {
        if (existing.quantity >= 10) return prev
        return prev.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i))
      }
      return [...prev, { id: item.id, name: item.name, price: item.price, quantity: 1 }]
    })
  }

  if (checking) return null

  const isStaff = role === 'staff' || role === 'manager'
  const tabs = TABS[role] ?? []

  return (
    <div className="min-h-screen bg-amber-50 p-6">
      <div className={isStaff ? 'max-w-3xl mx-auto' : 'max-w-md mx-auto'}>
        <header className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-amber-800">IGU Café ☕</h1>
          {session && (
            <button onClick={() => supabase.auth.signOut()} className="text-sm text-amber-800 underline">
              Sign out
            </button>
          )}
        </header>

        {!session && <Login />}

        {session && !role && <p className="text-gray-500">Loading...</p>}

        {session && role && (
          <div className="space-y-6">
            <p className="text-sm text-gray-600">
              Signed in as {session.user.email} ({role})
            </p>

            {isStaff ? (
              <>
                <nav className="flex gap-2">
                  {tabs.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTab(t.id)}
                      className={`px-4 py-2 rounded-lg ${
                        tab === t.id ? 'bg-amber-700 text-white' : 'bg-white text-amber-800'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </nav>

                {tab === 'orders' && <StaffDashboard />}
                {tab === 'availability' && <AvailabilityPanel />}
                {tab === 'menu' && role === 'manager' && <ManagerMenu />}
                {tab === 'reports' && role === 'manager' && <SalesReport />}
              </>
            ) : (
              <>
                <MyOrders />
                <Menu onAdd={addToCart} />
                <Cart cart={cart} setCart={setCart} />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default App