"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/auth-context"
import { FileText, CreditCard, Shield, Calendar, LogOut, Menu, Home, Building2, Bell } from "lucide-react"
import { Link, useLocation } from "react-router-dom"
import { NotificationCenter } from "@/components/notifications/notification-center"

const navigationItems = [
  { icon: Home, label: "Dashboard", href: "/patient" },
  { icon: FileText, label: "Treatment Plans", href: "/patient/treatments" },
  { icon: CreditCard, label: "Bills & Coverage", href: "/patient/billing" },
  { icon: Shield, label: "Insurance Policies", href: "/patient/policies" },
  { icon: Building2, label: "Insurance Companies", href: "/patient/insurers" },
  { icon: Calendar, label: "Visits & Incidents", href: "/patient/visits" },
]

export function PatientLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notificationCenterOpen, setNotificationCenterOpen] = useState(false)
  const { user, logout } = useAuth()
  const pathname = useLocation().pathname

  // Mock unread notification count
  const unreadNotifications = 1

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button variant="outline" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
          <Menu className="h-4 w-4" />
        </Button>
      </div>

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-sidebar border-r border-sidebar-border transform transition-transform duration-200 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-sidebar-border">
            <h1 className="text-xl font-bold text-primary">Healthcare Portal</h1>
            <p className="text-sm text-muted-foreground mt-1">Patient Portal</p>
          </div>

          <nav className="flex-1 p-4 space-y-2">
            {navigationItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link key={item.href} to={item.href}>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    className={`w-full justify-start ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    }`}
                  >
                    <item.icon className="mr-3 h-4 w-4" />
                    {item.label}
                  </Button>
                </Link>
              )
            })}
          </nav>

          <div className="p-4 border-t border-sidebar-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-sidebar-foreground">{user?.name}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={logout}
                className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:ml-64">
        <header className="bg-card border-b border-border p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-card-foreground">Patient Portal</h2>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">Welcome, {user?.name}</span>

              <Button variant="ghost" size="icon" className="relative" onClick={() => setNotificationCenterOpen(true)}>
                <Bell className="h-4 w-4" />
                {unreadNotifications > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-5 w-5 text-xs flex items-center justify-center p-0"
                  >
                    {unreadNotifications}
                  </Badge>
                )}
              </Button>
            </div>
          </div>
        </header>

        <main className="p-6">{children}</main>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <NotificationCenter isOpen={notificationCenterOpen} onClose={() => setNotificationCenterOpen(false)} />
    </div>
  )
}