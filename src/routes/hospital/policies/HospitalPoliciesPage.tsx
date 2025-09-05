"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Shield, History, Compass as Compare, AlertCircle, Plus, Minus } from "lucide-react"
import { mockPolicyHistory, mockPatients } from "@/lib/mock-hospital-data"
import type { PolicyHistory } from "@/types/hospital"

export default function PoliciesPage() {
  const [policyHistory] = useState<PolicyHistory[]>(mockPolicyHistory)
  const [selectedPolicies, setSelectedPolicies] = useState<string[]>([])

  const togglePolicySelection = (policyId: string) => {
    setSelectedPolicies((prev) =>
      prev.includes(policyId) ? prev.filter((id) => id !== policyId) : [...prev, policyId],
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Policy Management</h1>
        <p className="text-muted-foreground mt-2">View and compare patient insurance policies and their history.</p>
      </div>

      <Tabs defaultValue="history" className="space-y-4">
        <TabsList>
          <TabsTrigger value="history">Policy History</TabsTrigger>
          <TabsTrigger value="compare">Compare Policies</TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="space-y-4">
          {policyHistory.map((policy) => {
            const patient = mockPatients.find((p) => p.id === policy.patientId)
            return (
              <Card key={policy.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center">
                        <Shield className="h-5 w-5 mr-2 text-primary" />
                        {policy.insuranceProvider} - {patient?.name}
                      </CardTitle>
                      <CardDescription>
                        Policy: {policy.policyNumber} | {policy.effectiveDate} - {policy.expirationDate}
                      </CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={policy.status === "active" ? "default" : "secondary"}>{policy.status}</Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => togglePolicySelection(policy.id)}
                        className={selectedPolicies.includes(policy.id) ? "bg-primary text-primary-foreground" : ""}
                      >
                        {selectedPolicies.includes(policy.id) ? "Selected" : "Select"}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <h4 className="font-medium text-foreground flex items-center">
                      <History className="h-4 w-4 mr-2" />
                      Policy Changes
                    </h4>
                    <div className="space-y-3">
                      {policy.changes.map((change) => (
                        <div key={change.id} className="flex items-start space-x-3 p-3 bg-muted rounded-lg">
                          <div className="flex-shrink-0 mt-1">
                            {change.changeType === "coverage_added" ? (
                              <Plus className="h-4 w-4 text-green-600" />
                            ) : change.changeType === "coverage_removed" ? (
                              <Minus className="h-4 w-4 text-red-600" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-yellow-600" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="font-medium text-foreground">
                                {change.changeType.replace("_", " ").toUpperCase()}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(change.changeDate).toLocaleDateString()}
                              </p>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">{change.description}</p>
                            {change.affectedTreatments && (
                              <div className="mt-2">
                                <p className="text-xs font-medium text-foreground">Affected Treatments:</p>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {change.affectedTreatments.map((treatment) => (
                                    <Badge key={treatment} variant="outline" className="text-xs">
                                      {treatment}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </TabsContent>

        <TabsContent value="compare" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Compare className="h-5 w-5 mr-2 text-primary" />
                Policy Comparison
              </CardTitle>
              <CardDescription>
                Select policies from the History tab to compare their coverage and changes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedPolicies.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No policies selected for comparison.</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Go to the Policy History tab and select policies to compare.
                  </p>
                </div>
              ) : selectedPolicies.length === 1 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Select at least 2 policies to compare.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <h4 className="font-medium text-foreground">Comparing {selectedPolicies.length} policies</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedPolicies.map((policyId) => {
                      const policy = policyHistory.find((p) => p.id === policyId)
                      const patient = mockPatients.find((p) => p.id === policy?.patientId)
                      if (!policy) return null

                      return (
                        <Card key={policyId} className="border-2 border-primary">
                          <CardHeader>
                            <CardTitle className="text-lg">{policy.insuranceProvider}</CardTitle>
                            <CardDescription>
                              {patient?.name} - {policy.policyNumber}
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              <div>
                                <p className="text-sm font-medium text-foreground">Coverage Period</p>
                                <p className="text-sm text-muted-foreground">
                                  {policy.effectiveDate} - {policy.expirationDate}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-foreground">Recent Changes</p>
                                <p className="text-sm text-muted-foreground">
                                  {policy.changes.length} changes recorded
                                </p>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-foreground">Status</p>
                                <Badge variant={policy.status === "active" ? "default" : "secondary"}>
                                  {policy.status}
                                </Badge>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                  <Button variant="outline" onClick={() => setSelectedPolicies([])} className="w-full">
                    Clear Selection
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
