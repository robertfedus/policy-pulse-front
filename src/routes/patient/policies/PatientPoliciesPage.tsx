"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Shield, DollarSign, Calendar, CheckCircle, Info } from "lucide-react"
import { mockPatientPolicy } from "@/lib/mock-patient-data"
import type { PatientPolicy } from "@/types/patient"

export default function PatientPoliciesPage() {
  const [policy] = useState<PatientPolicy>(mockPatientPolicy)

  // Calculate deductible progress (mock data)
  const deductibleUsed = 800
  const deductibleProgress = (deductibleUsed / policy.deductible) * 100

  // Calculate out-of-pocket progress (mock data)
  const outOfPocketUsed = 1200
  const outOfPocketProgress = (outOfPocketUsed / policy.outOfPocketMax) * 100

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">My Insurance Policy</h1>
        <p className="text-muted-foreground mt-2">View your insurance policy details and coverage summary.</p>
      </div>

      {/* Policy Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <Shield className="h-5 w-5 mr-2 text-primary" />
                {policy.planName}
              </CardTitle>
              <CardDescription>
                {policy.insuranceProvider} • Policy: {policy.policyNumber}
              </CardDescription>
            </div>
            <Badge variant={policy.status === "active" ? "default" : "secondary"}>{policy.status}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Policy Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center space-x-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">Coverage Period</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(policy.effectiveDate).toLocaleDateString()} -{" "}
                  {new Date(policy.expirationDate).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">Deductible</p>
                <p className="text-sm text-muted-foreground">${policy.deductible}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">Copay</p>
                <p className="text-sm text-muted-foreground">${policy.copay}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">Out-of-Pocket Max</p>
                <p className="text-sm text-muted-foreground">${policy.outOfPocketMax}</p>
              </div>
            </div>
          </div>

          {/* Deductible Progress */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-foreground">Deductible Progress</h4>
                <span className="text-sm text-muted-foreground">
                  ${deductibleUsed} of ${policy.deductible}
                </span>
              </div>
              <Progress value={deductibleProgress} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                ${policy.deductible - deductibleUsed} remaining until deductible is met
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-foreground">Out-of-Pocket Progress</h4>
                <span className="text-sm text-muted-foreground">
                  ${outOfPocketUsed} of ${policy.outOfPocketMax}
                </span>
              </div>
              <Progress value={outOfPocketProgress} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                ${policy.outOfPocketMax - outOfPocketUsed} remaining until maximum is reached
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Coverage Details */}
      <Card>
        <CardHeader>
          <CardTitle>Coverage Details</CardTitle>
          <CardDescription>What your insurance plan covers and any limitations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {policy.coverageDetails.map((coverage, index) => (
              <div key={index} className="flex items-start justify-between p-4 border border-border rounded-lg">
                <div className="flex items-start space-x-3 flex-1">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="font-medium text-foreground">{coverage.category}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{coverage.description}</p>
                    {coverage.limitations && (
                      <div className="flex items-center space-x-1 mt-2">
                        <Info className="h-3 w-3 text-yellow-600" />
                        <p className="text-xs text-yellow-700">{coverage.limitations}</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    {coverage.coveragePercentage}% Covered
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Policy Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Policy Summary</CardTitle>
          <CardDescription>Key information about your current coverage</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-medium text-foreground">What's Covered</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center space-x-2">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  <span>Preventive care at 100%</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  <span>Emergency services at 80%</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  <span>Specialist visits at 70%</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  <span>Physical therapy at 80%</span>
                </li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="font-medium text-foreground">Important Notes</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Referrals required for specialist visits</li>
                <li>• Pre-authorization needed for MRI/CT scans</li>
                <li>• Physical therapy limited to 20 sessions per year</li>
                <li>• X-Ray coverage removed effective January 1, 2024</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
