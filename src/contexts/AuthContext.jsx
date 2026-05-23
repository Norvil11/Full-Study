import { createContext, useContext, useEffect, useState } from 'react'
import { getSession, onAuthStateChange, supabase } from '@/lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined) // undefined = loading
  const [user, setUser] = useState(null)

  useEffect(() => {
    getSession().then((s) => {
      setSession(s)
      setUser(s?.user ?? null)
    })

    const { data: { subscription } } = onAuthStateChange((s) => {
      setSession(s)
      setUser(s?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ session, user, loading: session === undefined }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
