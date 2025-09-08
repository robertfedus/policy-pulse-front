import type React from "react"
import { createContext, useContext, useEffect, useMemo, useState } from "react"
import type { User, AuthContextType } from "@/types/auth"

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/+$/, "") ?? ""
const STORAGE_USER_KEY = "pp.auth.user"
const STORAGE_TOKEN_KEY = "pp.auth.token"

function safeParse<T>(str: string | null): T | null {
  if (!str) return null
  try { return JSON.parse(str) as T } catch { return null }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Restore session from localStorage
  useEffect(() => {
    const storedUser = safeParse<User>(localStorage.getItem(STORAGE_USER_KEY))
    const storedToken = localStorage.getItem(STORAGE_TOKEN_KEY)
    if (storedUser) setUser(storedUser)
    if (storedToken) setToken(storedToken)
  }, [])

  useEffect(() => {
    if (user) localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user))
    else localStorage.removeItem(STORAGE_USER_KEY)
  }, [user])

  useEffect(() => {
    if (token) localStorage.setItem(STORAGE_TOKEN_KEY, token)
    else localStorage.removeItem(STORAGE_TOKEN_KEY)
  }, [token])

  async function login(email: string, password: string): Promise<User | null> {
    setIsLoading(true)
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 8000)

    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
        method: "POST",
        signal: ctrl.signal,
        credentials: "include",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      if (!res.ok) {
        let msg = `HTTP ${res.status}`
        try {
          const errJson = await res.json()
          const m = errJson?.message || errJson?.error
          if (m) msg += ` – ${m}`
        } catch {}
        console.error("Login failed:", msg)
        return null
      }

      const payload = await res.json()

      // Your backend shape: { user: {...}, token: "..." }
      const rawUser = payload?.user ?? payload?.data ?? payload
      const rawToken = payload?.token ?? payload?.accessToken ?? payload?.data?.token ?? null

      if (!rawUser?.id || !rawUser?.email) return null

      // ✅ Preserve insuredAt + ilnesses from backend
      const authed: User = {
        id: rawUser.id,
        email: rawUser.email,
        name: rawUser.name ?? "",
        role: rawUser.role ?? "patient",
        insuredAt: Array.isArray(rawUser.insuredAt) ? rawUser.insuredAt : [],
        ilnesses: Array.isArray(rawUser.ilnesses) ? rawUser.ilnesses : [],
      }

      setUser(authed)
      setToken(rawToken)

      localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(authed))
      if (rawToken) localStorage.setItem(STORAGE_TOKEN_KEY, rawToken)
      else localStorage.removeItem(STORAGE_TOKEN_KEY)

      return authed
    } catch (err) {
      console.error("Network error during login:", err)
      return null
    } finally {
      clearTimeout(t)
      setIsLoading(false)
    }
  }

  async function logout() {
    setUser(null)
    setToken(null)
    localStorage.removeItem(STORAGE_USER_KEY)
    localStorage.removeItem(STORAGE_TOKEN_KEY)

    try {
      await fetch(`${API_BASE}/api/v1/auth/logout`, {
        method: "POST",
        credentials: "include",
      })
    } catch {}
  }

  const authHeaders = useMemo(() => (token ? { Authorization: `Bearer ${token}` } : {}), [token])

  const value = useMemo(
    () => ({ user, login, logout, isLoading, authHeaders }),
    [user, login, logout, isLoading, authHeaders]
  ) as AuthContextType & { authHeaders: Record<string, string> }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider")
  return ctx
}
