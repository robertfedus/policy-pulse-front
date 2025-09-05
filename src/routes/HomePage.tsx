import React from 'react'
"use client"

import { RoleBasedLayout } from "@/components/layout/role-based-layout"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, FileText, Shield, Activity } from "lucide-react"

function HospitalDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Hospital Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Manage patients, treatment plans, and policies from your central hub.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,234</div>
            <p className="text-xs text-muted-foreground">+12% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Treatments</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">456</div>
            <p className="text-xs text-muted-foreground">+8% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Policy Updates</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">23</div>
            <p className="text-xs text-muted-foreground">This week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Online</div>
            <p className="text-xs text-muted-foreground">All systems operational</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function PatientDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Patient Portal</h1>
        <p className="text-muted-foreground mt-2">Access your treatment plans, bills, and insurance information.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="mr-2 h-5 w-5 text-primary" />
              Current Treatment
            </CardTitle>
            <CardDescription>Your active treatment plan</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Physical Therapy - Week 3 of 8</p>
            <div className="mt-2 w-full bg-muted rounded-full h-2">
              <div className="bg-primary h-2 rounded-full" style={{ width: "37.5%" }}></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="mr-2 h-5 w-5 text-primary" />
              Insurance Status
            </CardTitle>
            <CardDescription>Your coverage information</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">BlueCross BlueShield</p>
            <p className="text-xs text-muted-foreground">Premium Plan - Active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="mr-2 h-5 w-5 text-primary" />
              Recent Activity
            </CardTitle>
            <CardDescription>Latest updates</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Policy updated 2 days ago</p>
            <p className="text-xs text-muted-foreground">New coverage added</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function HomePage() {
  const { user } = useAuth()

  return <RoleBasedLayout>{user?.role === "hospital" ? <HospitalDashboard /> : <PatientDashboard />}</RoleBasedLayout>
}
