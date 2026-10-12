import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import Login from './components/Login'
import Menu from './components/Menu'
import Cart from './components/Cart'

function App() {
  const [session, setSession] = useState(null)
  const [checking, setChecking] = useState(true)
  const [cart, setCart] = useState([])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setChecking(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      if (!newSession) setCart([])
    })

    return () => listener.subscription.unsubscribe()
  }, [])

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

  return (
    <div className="min-h-screen bg-amber-50 p-6">
      <div className="max-w-md mx-auto">
        <header className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-amber-800">IGU Café ☕</h1>
          {session && (
            <button onClick={() => supabase.auth.signOut()} className="text-sm text-amber-800 underline">
              Sign out
            </button>
          )}
        </header>

        {session ? (
          <div className="space-y-6">
            <p className="text-sm text-gray-600">Signed in as {session.user.email}</p>
            <Menu onAdd={addToCart} />
            <Cart cart={cart} setCart={setCart} />
          </div>
        ) : (
          <Login />
        )}
      </div>
    </div>
  )
}

export default App