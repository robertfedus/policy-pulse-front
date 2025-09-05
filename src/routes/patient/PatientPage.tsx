import React from 'react'
"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { FileText, Shield, Activity, Calendar, AlertTriangle, CheckCircle } from "lucide-react"
import { mockPatientTreatmentPlan, mockPatientBills, mockPatientPolicy } from "@/lib/mock-patient-data"

export default function PatientDashboard() {
  const upcomingAppointments = 2
  const pendingBills = mockPatientBills.filter((b) => b.status === "pending").length
  const totalOwed = mockPatientBills
    .filter((b) => b.status !== "paid")
    .reduce((sum, bill) => sum + bill.patientAmount, 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Patient Portal</h1>
        <p className="text-muted-foreground mt-2">Access your treatment plans, bills, and insurance information.</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Treatment Progress</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockPatientTreatmentPlan.progress}%</div>
            <p className="text-xs text-muted-foreground">Week 3 of 8</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Appointments</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingAppointments}</div>
            <p className="text-xs text-muted-foreground">Next: Jan 20, 2024</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Bills</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingBills}</div>
            <p className="text-xs text-muted-foreground">${totalOwed} owed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Insurance Status</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Active</div>
            <p className="text-xs text-muted-foreground">{mockPatientPolicy.planName}</p>
          </CardContent>
        </Card>
      </div>

      {/* Current Treatment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="mr-2 h-5 w-5 text-primary" />
            Current Treatment Plan
          </CardTitle>
          <CardDescription>Your active treatment progress and details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-foreground">{mockPatientTreatmentPlan.title}</h4>
              <p className="text-sm text-muted-foreground">Dr. {mockPatientTreatmentPlan.doctorName}</p>
            </div>
            <Badge variant="default">Active</Badge>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{mockPatientTreatmentPlan.progress}% Complete</span>
            </div>
            <Progress value={mockPatientTreatmentPlan.progress} className="h-2" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="font-medium text-foreground">Total Cost</p>
              <p className="text-muted-foreground">${mockPatientTreatmentPlan.totalCost}</p>
            </div>
            <div>
              <p className="font-medium text-foreground">Insurance Covers</p>
              <p className="text-green-600">${mockPatientTreatmentPlan.coveredAmount}</p>
            </div>
            <div>
              <p className="font-medium text-foreground">Your Cost</p>
              <p className="text-red-600">${mockPatientTreatmentPlan.uncoveredAmount}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="mr-2 h-5 w-5 text-primary" />
              Recent Activity
            </CardTitle>
            <CardDescription>Your latest medical activities and updates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">Physical therapy session completed</p>
                <p className="text-xs text-muted-foreground">January 15, 2024</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">MRI scan results available</p>
                <p className="text-xs text-muted-foreground">January 10, 2024</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">Insurance policy updated</p>
                <p className="text-xs text-muted-foreground">January 1, 2024</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="mr-2 h-5 w-5 text-yellow-600" />
              Important Alerts
            </CardTitle>
            <CardDescription>Updates and notifications requiring your attention</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800">Policy Change</p>
                  <p className="text-xs text-red-600">X-Ray coverage removed from your plan</p>
                </div>
              </div>
            </div>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-800">Appointment Reminder</p>
                  <p className="text-xs text-blue-600">Follow-up consultation on Jan 20</p>
                </div>
              </div>
            </div>
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">Bill Due Soon</p>
                  <p className="text-xs text-yellow-600">Invoice INV-2024-001 due Feb 15</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
