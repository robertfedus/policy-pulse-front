import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/auth-context"
import { FileText, CreditCard, Shield, LogOut, Menu, Home, Building2, Bell } from "lucide-react"
import { NavLink, useLocation } from "react-router-dom"
import { NotificationCenter } from "@/components/notifications/notification-center"

const navigationItems = [
  { icon: Home, label: "Dashboard", href: "/patient", end: true },
  { icon: FileText, label: "Treatment Plans", href: "/patient/treatments" },
  // ⬇️ Renamed and moved to a clearer path
  { icon: CreditCard, label: "Policy Coverage", href: "/patient/coverage" },
  { icon: Shield, label: "Insurance Policies", href: "/patient/policies" },
  { icon: Building2, label: "Insurance Companies", href: "/patient/insurers" },
  // ⛔ Removed: { Calendar, "Visits & Incidents", "/patient/visits" }
]

// Helper: title matching current path
const titleForPath = (path: string) => {
  const match = navigationItems.find(
    (n) => path === n.href || path.startsWith(n.href + "/")
  )
  return match?.label ?? "Patient Portal"
}

export function PatientLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notificationCenterOpen, setNotificationCenterOpen] = useState(false)
  const { user, logout } = useAuth()
  const pathname = useLocation().pathname

  const unreadNotifications = 1

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label={sidebarOpen ? "Close menu" : "Open menu"}
        >
          <Menu className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-sidebar border-r border-sidebar-border transform transition-transform duration-200 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
        aria-label="Sidebar navigation"
      >
        <div className="flex flex-col h-full overflow-hidden">
          <div className="p-6 border-b border-sidebar-border">
            <h1 className="text-xl font-bold text-primary">Healthcare Portal</h1>
            <p className="text-sm text-muted-foreground mt-1">Patient Portal</p>
          </div>

          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {navigationItems.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                end={item.end}
                onClick={() => setSidebarOpen(false)}
                className="block"
              >
                {({ isActive }) => (
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    className={`w-full justify-start ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    }`}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <item.icon className="mr-3 h-4 w-4" aria-hidden="true" />
                    {item.label}
                  </Button>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Sticky user panel */}
          <div className="p-4 border-t border-sidebar-border sticky bottom-0 bg-sidebar">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {user?.name}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.email}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => logout()}
                className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                aria-label="Log out"
                title="Log out"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:ml-64">
        <header className="bg-card border-b border-border p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-card-foreground">
              {titleForPath(pathname)}
            </h2>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">
                Welcome, {user?.name}
              </span>

              <Button
                variant="ghost"
                size="icon"
                className="relative"
                onClick={() => setNotificationCenterOpen(true)}
                aria-label="Open notifications"
              >
                <Bell className="h-4 w-4" aria-hidden="true" />
                {unreadNotifications > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-5 w-5 text-xs flex items-center justify-center p-0"
                    aria-label={`${unreadNotifications} unread notifications`}
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
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <NotificationCenter
        isOpen={notificationCenterOpen}
        onClose={() => setNotificationCenterOpen(false)}
      />
    </div>
  )
}
