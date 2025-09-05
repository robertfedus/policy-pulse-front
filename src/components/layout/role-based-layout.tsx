"use client"

import type React from "react"

import { useAuth } from "@/contexts/auth-context"
import { HospitalLayout } from "./hospital-layout"
import { PatientLayout } from "./patient-layout"
import { LoginForm } from "@/components/auth/login-form"

export function RoleBasedLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <LoginForm />
  }

  if (user.role === "hospital") {
    return <HospitalLayout>{children}</HospitalLayout>
  }

  return <PatientLayout>{children}</PatientLayout>
}
