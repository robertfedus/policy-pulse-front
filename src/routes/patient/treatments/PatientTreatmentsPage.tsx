"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { FileText, Calendar, User, Building, AlertTriangle, CheckCircle, Clock, XCircle } from "lucide-react"
import { mockPatientTreatmentPlan } from "@/lib/mock-patient-data"
import type { PatientTreatmentPlan } from "@/types/patient"

export default function PatientTreatmentsPage() {
  const [treatmentPlan] = useState<PatientTreatmentPlan>(mockPatientTreatmentPlan)

  const removedTreatments = treatmentPlan.treatments.filter((t) => t.removed)
  const activeTreatments = treatmentPlan.treatments.filter((t) => !t.removed)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">My Treatment Plan</h1>
        <p className="text-muted-foreground mt-2">View your current treatment plan and progress.</p>
      </div>

      {/* Treatment Plan Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2 text-primary" />
                {treatmentPlan.title}
              </CardTitle>
              <CardDescription>{treatmentPlan.description}</CardDescription>
            </div>
            <Badge variant={treatmentPlan.status === "active" ? "default" : "secondary"}>{treatmentPlan.status}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-foreground">Treatment Progress</h4>
              <span className="text-sm text-muted-foreground">{treatmentPlan.progress}% Complete</span>
            </div>
            <Progress value={treatmentPlan.progress} className="h-2" />
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center space-x-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">Duration</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(treatmentPlan.startDate).toLocaleDateString()} -{" "}
                  {new Date(treatmentPlan.endDate).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">Doctor</p>
                <p className="text-sm text-muted-foreground">{treatmentPlan.doctorName}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Building className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">Hospital</p>
                <p className="text-sm text-muted-foreground">{treatmentPlan.hospitalName}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">Total Cost</p>
                <p className="text-sm text-muted-foreground">${treatmentPlan.totalCost}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Removed Treatments Alert */}
      {removedTreatments.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {removedTreatments.length} treatment(s) have been removed from your plan due to policy changes. You have
            been notified via email about these changes.
          </AlertDescription>
        </Alert>
      )}

      {/* Active Treatments */}
      <Card>
        <CardHeader>
          <CardTitle>Active Treatments</CardTitle>
          <CardDescription>Your current treatment schedule and status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activeTreatments.map((treatment) => (
              <div key={treatment.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    {treatment.status === "completed" ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : treatment.status === "scheduled" ? (
                      <Clock className="h-5 w-5 text-blue-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground">{treatment.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {new Date(treatment.date).toLocaleDateString()} • Code: {treatment.code}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-foreground">${treatment.cost}</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge variant={treatment.covered ? "default" : "secondary"}>
                      {treatment.covered ? "Covered" : "Not Covered"}
                    </Badge>
                    <Badge
                      variant={
                        treatment.status === "completed"
                          ? "default"
                          : treatment.status === "scheduled"
                            ? "secondary"
                            : "destructive"
                      }
                    >
                      {treatment.status}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Removed Treatments */}
      {removedTreatments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-red-700">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Removed Treatments
            </CardTitle>
            <CardDescription>Treatments removed due to policy changes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {removedTreatments.map((treatment) => (
                <div
                  key={treatment.id}
                  className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-red-700 line-through">{treatment.name}</h4>
                      <p className="text-sm text-red-600">
                        Removed: {treatment.removedDate} • {treatment.removedReason}
                      </p>
                      <p className="text-xs text-muted-foreground">Code: {treatment.code}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-red-700 line-through">${treatment.cost}</p>
                    <Badge variant="destructive">Removed</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
