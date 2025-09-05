"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Bell, X, Check, AlertTriangle, Info, CheckCircle, Clock } from "lucide-react"
import type { SystemNotification } from "@/types/notifications"
import { useAuth } from "@/contexts/auth-context"

interface NotificationCenterProps {
  isOpen: boolean
  onClose: () => void
}

export function NotificationCenter({ isOpen, onClose }: NotificationCenterProps) {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<SystemNotification[]>([])

  useEffect(() => {
    if (user && isOpen) {
      // Mock notifications based on user role
      const mockNotifications: SystemNotification[] =
        user.role === "hospital"
          ? [
              {
                id: "notif-1",
                userId: user.id,
                userRole: "hospital",
                type: "policy_update",
                title: "Policy Update - BlueCross BlueShield",
                message: "X-Ray coverage removed from basic plans. 15 patients affected.",
                priority: "high",
                read: false,
                actionRequired: true,
                actionUrl: "/hospital/policies",
                createdDate: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
              },
              {
                id: "notif-2",
                userId: user.id,
                userRole: "hospital",
                type: "insurer_update",
                title: "Aetna System Maintenance",
                message: "Claims processing may be delayed on January 20, 2024.",
                priority: "medium",
                read: false,
                actionRequired: false,
                createdDate: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
              },
              {
                id: "notif-3",
                userId: user.id,
                userRole: "hospital",
                type: "treatment_approval",
                title: "Treatment Approved",
                message: "MRI scan for John Smith approved by BlueCross BlueShield.",
                priority: "low",
                read: true,
                actionRequired: false,
                createdDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
              },
            ]
          : [
              {
                id: "notif-4",
                userId: user.id,
                userRole: "patient",
                type: "policy_update",
                title: "Important Policy Change",
                message: "X-Ray coverage has been removed from your insurance plan effective January 1, 2024.",
                priority: "urgent",
                read: false,
                actionRequired: true,
                actionUrl: "/patient/policies",
                createdDate: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
              },
              {
                id: "notif-5",
                userId: user.id,
                userRole: "patient",
                type: "treatment_approval",
                title: "Treatment Approved",
                message: "Your MRI scan has been approved by insurance. Appointment scheduled for January 20.",
                priority: "medium",
                read: false,
                actionRequired: false,
                createdDate: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
              },
              {
                id: "notif-6",
                userId: user.id,
                userRole: "patient",
                type: "payment_received",
                title: "Payment Received",
                message: "Your payment of $200 for Invoice INV-2024-002 has been processed.",
                priority: "low",
                read: true,
                actionRequired: false,
                createdDate: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
              },
            ]

      setNotifications(mockNotifications)
    }
  }, [user, isOpen])

  const markAsRead = (notificationId: string) => {
    setNotifications((prev) => prev.map((notif) => (notif.id === notificationId ? { ...notif, read: true } : notif)))
  }

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((notif) => ({ ...notif, read: true })))
  }

  const getNotificationIcon = (type: SystemNotification["type"], priority: SystemNotification["priority"]) => {
    if (priority === "urgent") return <AlertTriangle className="h-4 w-4 text-red-600" />

    switch (type) {
      case "policy_update":
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      case "treatment_approval":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "payment_received":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "system_maintenance":
        return <Clock className="h-4 w-4 text-blue-600" />
      case "insurer_update":
        return <Info className="h-4 w-4 text-blue-600" />
      default:
        return <Bell className="h-4 w-4 text-gray-600" />
    }
  }

  const getPriorityColor = (priority: SystemNotification["priority"]) => {
    switch (priority) {
      case "urgent":
        return "border-l-red-500 bg-red-50"
      case "high":
        return "border-l-orange-500 bg-orange-50"
      case "medium":
        return "border-l-blue-500 bg-blue-50"
      case "low":
        return "border-l-gray-500 bg-gray-50"
      default:
        return "border-l-gray-500 bg-gray-50"
    }
  }

  const unreadCount = notifications.filter((n) => !n.read).length

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-end p-4">
      <Card className="w-full max-w-md h-[600px] flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="flex items-center">
              <Bell className="h-5 w-5 mr-2" />
              Notifications
            </CardTitle>
            <CardDescription>
              {unreadCount > 0 ? `${unreadCount} unread notifications` : "All caught up!"}
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                <Check className="h-4 w-4 mr-1" />
                Mark all read
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-0">
          <ScrollArea className="h-full px-6">
            <div className="space-y-3">
              {notifications.length === 0 ? (
                <div className="text-center py-8">
                  <Bell className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No notifications</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 border-l-4 rounded-lg cursor-pointer transition-all hover:shadow-sm ${
                      !notification.read ? getPriorityColor(notification.priority) : "border-l-gray-300 bg-gray-50"
                    }`}
                    onClick={() => !notification.read && markAsRead(notification.id)}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type, notification.priority)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4
                            className={`text-sm font-medium ${!notification.read ? "text-foreground" : "text-muted-foreground"}`}
                          >
                            {notification.title}
                          </h4>
                          <div className="flex items-center space-x-1">
                            {notification.priority === "urgent" && (
                              <Badge variant="destructive" className="text-xs">
                                Urgent
                              </Badge>
                            )}
                            {!notification.read && <div className="w-2 h-2 bg-primary rounded-full"></div>}
                          </div>
                        </div>
                        <p className={`text-sm ${!notification.read ? "text-foreground" : "text-muted-foreground"}`}>
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-xs text-muted-foreground">
                            {new Date(notification.createdDate).toLocaleString()}
                          </p>
                          {notification.actionRequired && notification.actionUrl && (
                            <Button variant="outline" size="sm" className="text-xs bg-transparent">
                              View Details
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
