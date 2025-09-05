"use client"

import type React from "react"
import { createContext, useContext, useState } from "react"
import type { User, AuthContextType } from "@/types/auth"
import { authenticateUser } from "@/lib/mock-auth"

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Start with no user; don't attempt to restore from localStorage
  const [user, setUser] = useState<User | null>(null)
  // No async rehydration -> not loading after initial mount
  const [isLoading, setIsLoading] = useState(false)

  async function login(email: string, password: string) {
    setIsLoading(true)
    try {
      const authed = await authenticateUser(email, password)
      if (authed) {
        setUser(authed)
        // ❌ No localStorage.setItem — do not persist the session
        return true
      }
      return false
    } finally {
      setIsLoading(false)
    }
  }

  function logout() {
    setUser(null)
    // ❌ No localStorage.removeItem
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (ctx === undefined) throw new Error("useAuth must be used within an AuthProvider")
  return ctx
}
