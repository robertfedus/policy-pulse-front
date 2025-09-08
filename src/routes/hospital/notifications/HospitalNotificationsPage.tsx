"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Bell, Mail, AlertTriangle, CheckCircle, Clock, Send, Users, Plus } from "lucide-react"
import { mockNotifications, mockPatients } from "@/lib/mock-hospital-data"
import { PolicyChangeWizard } from "@/components/notifications/policy-change-wizard"
import type { Notification } from "@/types/hospital"
import { RoleBasedLayout } from "@/components/layout/role-based-layout"

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications)
  const [policyWizardOpen, setPolicyWizardOpen] = useState(false)

  const markAsRead = (notificationId: string) => {
    setNotifications((prev) =>
      prev.map((notification) => (notification.id === notificationId ? { ...notification, read: true } : notification)),
    )
  }

  const unreadCount = notifications.filter((n) => !n.read).length
  const urgentCount = notifications.filter((n) => n.urgent && !n.read).length

  const getNotificationIcon = (type: Notification["type"]) => {
    switch (type) {
      case "policy_update":
        return <AlertTriangle className="h-4 w-4" />
      case "insurer_update":
        return <Bell className="h-4 w-4" />
      case "treatment_approval":
        return <CheckCircle className="h-4 w-4" />
      case "payment_received":
        return <CheckCircle className="h-4 w-4" />
      default:
        return <Bell className="h-4 w-4" />
    }
  }

  const getNotificationColor = (type: Notification["type"]) => {
    switch (type) {
      case "policy_update":
        return "text-yellow-600"
      case "insurer_update":
        return "text-blue-600"
      case "treatment_approval":
        return "text-green-600"
      case "payment_received":
        return "text-green-600"
      default:
        return "text-gray-600"
    }
  }

  return (
    <RoleBasedLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Notifications</h1>
            <p className="text-muted-foreground mt-2">Manage system notifications and patient communications.</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm font-medium text-foreground">{unreadCount} Unread</p>
              {urgentCount > 0 && <p className="text-xs text-red-600">{urgentCount} Urgent</p>}
            </div>
            <Button onClick={() => setPolicyWizardOpen(true)}>
              <Send className="h-4 w-4 mr-2" />
              Send Policy Update
            </Button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setPolicyWizardOpen(true)}>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Mail className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">Policy Change Notification</h3>
                  <p className="text-sm text-muted-foreground">Notify patients about policy updates</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Users className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">Bulk Patient Alert</h3>
                  <p className="text-sm text-muted-foreground">Send alerts to multiple patients</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Plus className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">Custom Notification</h3>
                  <p className="text-sm text-muted-foreground">Create custom patient notification</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">All Notifications</TabsTrigger>
            <TabsTrigger value="unread">Unread ({unreadCount})</TabsTrigger>
            <TabsTrigger value="urgent">Urgent ({urgentCount})</TabsTrigger>
            <TabsTrigger value="sent">Sent Notifications</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            <div className="space-y-3">
              {notifications.map((notification) => {
                const patient = notification.patientId ? mockPatients.find((p) => p.id === notification.patientId) : null

                return (
                  <Card
                    key={notification.id}
                    className={`transition-all hover:shadow-md ${!notification.read ? "border-l-4 border-l-primary bg-card" : "bg-muted/30"
                      } ${notification.urgent ? "border-l-red-500" : ""}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          <div className={`mt-1 ${getNotificationColor(notification.type)}`}>
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <h4
                                className={`font-medium ${!notification.read ? "text-foreground" : "text-muted-foreground"}`}
                              >
                                {notification.title}
                              </h4>
                              {notification.urgent && (
                                <Badge variant="destructive" className="text-xs">
                                  Urgent
                                </Badge>
                              )}
                              {!notification.read && (
                                <Badge variant="default" className="text-xs">
                                  New
                                </Badge>
                              )}
                            </div>
                            <p className={`text-sm ${!notification.read ? "text-foreground" : "text-muted-foreground"}`}>
                              {notification.message}
                            </p>
                            {patient && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Patient: {patient.name} ({patient.email})
                              </p>
                            )}
                            <div className="flex items-center space-x-4 mt-2 text-xs text-muted-foreground">
                              <div className="flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                {new Date(notification.date).toLocaleString()}
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {notification.type.replace("_", " ")}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {!notification.read && (
                            <Button variant="outline" size="sm" onClick={() => markAsRead(notification.id)}>
                              Mark Read
                            </Button>
                          )}
                          <Button variant="ghost" size="sm">
                            <Mail className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </TabsContent>

          <TabsContent value="unread" className="space-y-4">
            <div className="space-y-3">
              {notifications
                .filter((n) => !n.read)
                .map((notification) => {
                  const patient = notification.patientId
                    ? mockPatients.find((p) => p.id === notification.patientId)
                    : null

                  return (
                    <Card key={notification.id} className="border-l-4 border-l-primary">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3 flex-1">
                            <div className={`mt-1 ${getNotificationColor(notification.type)}`}>
                              {getNotificationIcon(notification.type)}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <h4 className="font-medium text-foreground">{notification.title}</h4>
                                {notification.urgent && (
                                  <Badge variant="destructive" className="text-xs">
                                    Urgent
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-foreground">{notification.message}</p>
                              {patient && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Patient: {patient.name} ({patient.email})
                                </p>
                              )}
                            </div>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => markAsRead(notification.id)}>
                            Mark Read
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
            </div>
          </TabsContent>

          <TabsContent value="urgent" className="space-y-4">
            <div className="space-y-3">
              {notifications
                .filter((n) => n.urgent && !n.read)
                .map((notification) => {
                  const patient = notification.patientId
                    ? mockPatients.find((p) => p.id === notification.patientId)
                    : null

                  return (
                    <Card key={notification.id} className="border-l-4 border-l-red-500 bg-red-50">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3 flex-1">
                            <AlertTriangle className="h-4 w-4 text-red-600 mt-1" />
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <h4 className="font-medium text-foreground">{notification.title}</h4>
                                <Badge variant="destructive" className="text-xs">
                                  Urgent
                                </Badge>
                              </div>
                              <p className="text-sm text-foreground">{notification.message}</p>
                              {patient && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Patient: {patient.name} ({patient.email})
                                </p>
                              )}
                            </div>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => markAsRead(notification.id)}>
                            Mark Read
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
            </div>
          </TabsContent>

          <TabsContent value="sent" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Sent Notifications</CardTitle>
                <CardDescription>Notifications sent to patients in the last 30 days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Mail className="h-5 w-5 text-blue-600" />
                      <div>
                        <h4 className="font-medium text-foreground">Policy Change - X-Ray Coverage</h4>
                        <p className="text-sm text-muted-foreground">Sent to 15 patients • January 1, 2024</p>
                      </div>
                    </div>
                    <Badge variant="default">Delivered</Badge>
                  </div>

                  <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Mail className="h-5 w-5 text-green-600" />
                      <div>
                        <h4 className="font-medium text-foreground">Treatment Approval Notifications</h4>
                        <p className="text-sm text-muted-foreground">Sent to 8 patients • December 28, 2023</p>
                      </div>
                    </div>
                    <Badge variant="default">Delivered</Badge>
                  </div>

                  <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Mail className="h-5 w-5 text-yellow-600" />
                      <div>
                        <h4 className="font-medium text-foreground">System Maintenance Alert</h4>
                        <p className="text-sm text-muted-foreground">Sent to all patients • December 20, 2023</p>
                      </div>
                    </div>
                    <Badge variant="default">Delivered</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <PolicyChangeWizard isOpen={policyWizardOpen} onClose={() => setPolicyWizardOpen(false)} />
      </div>
    </RoleBasedLayout>
  )
}
