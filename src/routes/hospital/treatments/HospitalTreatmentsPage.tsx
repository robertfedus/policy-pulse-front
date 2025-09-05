"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, FileText, DollarSign, AlertTriangle, CheckCircle, XCircle } from "lucide-react"
import { mockTreatmentPlans } from "@/lib/mock-hospital-data"
import type { TreatmentPlan } from "@/types/hospital"

export default function TreatmentsPage() {
  const [treatmentPlans] = useState<TreatmentPlan[]>(mockTreatmentPlans)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Treatment Plans</h1>
          <p className="text-muted-foreground mt-2">Manage patient treatment plans and coverage details.</p>
        </div>
        <Button className="flex items-center">
          <Upload className="h-4 w-4 mr-2" />
          Upload Treatment Plan
        </Button>
      </div>

      {/* Treatment Plans List */}
      <div className="space-y-4">
        {treatmentPlans.map((plan) => (
          <Card key={plan.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center">
                    <FileText className="h-5 w-5 mr-2 text-primary" />
                    {plan.title}
                  </CardTitle>
                  <CardDescription>
                    Patient: {plan.patientName} | {plan.startDate} - {plan.endDate}
                  </CardDescription>
                </div>
                <Badge
                  variant={
                    plan.status === "active" ? "default" : plan.status === "completed" ? "secondary" : "destructive"
                  }
                >
                  {plan.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{plan.description}</p>

              {/* Cost Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                <div className="text-center">
                  <div className="flex items-center justify-center mb-1">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-foreground">Total Cost</p>
                  <p className="text-lg font-bold">${plan.totalCost}</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center mb-1">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <p className="text-sm font-medium text-foreground">Covered</p>
                  <p className="text-lg font-bold text-green-600">${plan.coveredAmount}</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center mb-1">
                    <XCircle className="h-4 w-4 text-red-600" />
                  </div>
                  <p className="text-sm font-medium text-foreground">Uncovered</p>
                  <p className="text-lg font-bold text-red-600">${plan.uncoveredAmount}</p>
                </div>
              </div>

              {/* Treatments List */}
              <div>
                <h4 className="font-medium text-foreground mb-3">Treatments</h4>
                <div className="space-y-2">
                  {plan.treatments.map((treatment) => (
                    <div
                      key={treatment.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        treatment.removed ? "bg-red-50 border-red-200" : "bg-card border-border"
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        {treatment.removed ? (
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                        ) : treatment.covered ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                        <div>
                          <p
                            className={`font-medium ${treatment.removed ? "text-red-700 line-through" : "text-foreground"}`}
                          >
                            {treatment.name}
                          </p>
                          <p className="text-xs text-muted-foreground">Code: {treatment.code}</p>
                          {treatment.removed && (
                            <p className="text-xs text-red-600 mt-1">
                              Removed: {treatment.removedReason} ({treatment.removedDate})
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className={`font-medium ${treatment.removed ? "text-red-700 line-through" : "text-foreground"}`}
                        >
                          ${treatment.cost}
                        </p>
                        <Badge
                          variant={treatment.covered && !treatment.removed ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {treatment.removed ? "Removed" : treatment.covered ? "Covered" : "Not Covered"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Alert for removed treatments */}
              {plan.treatments.some((t) => t.removed) && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Some treatments have been removed due to policy changes. Patient has been notified automatically.
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex space-x-2">
                <Button variant="outline" size="sm">
                  View Full Plan
                </Button>
                <Button variant="outline" size="sm">
                  Generate Invoice
                </Button>
                <Button variant="outline" size="sm">
                  Notify Patient
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
