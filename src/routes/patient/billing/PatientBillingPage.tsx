import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CreditCard, Download, Eye, DollarSign, Shield, CheckCircle, AlertCircle } from "lucide-react"
import { mockPatientBills, mockPatientTreatmentPlan } from "@/lib/mock-patient-data"
import type { PatientBill } from "@/types/patient"
import { RoleBasedLayout } from "@/components/layout/role-based-layout"

export default function PatientBillingPage() {
  const [bills] = useState<PatientBill[]>(mockPatientBills)

  const totalOwed = bills.filter((b) => b.status !== "paid").reduce((sum, bill) => sum + bill.patientAmount, 0)
  const totalCovered = bills.reduce((sum, bill) => sum + bill.coveredAmount, 0)
  const totalBilled = bills.reduce((sum, bill) => sum + bill.totalAmount, 0)

  return (
    <RoleBasedLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Bills & Coverage</h1>
          <p className="text-muted-foreground mt-2">View your medical bills and insurance coverage details.</p>
        </div>

        {/* Coverage Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Billed</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalBilled}</div>
              <p className="text-xs text-muted-foreground">All medical services</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Insurance Covered</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">${totalCovered}</div>
              <p className="text-xs text-muted-foreground">
                {totalBilled > 0 ? Math.round((totalCovered / totalBilled) * 100) : 0}% coverage
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Amount Owed</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">${totalOwed}</div>
              <p className="text-xs text-muted-foreground">Outstanding balance</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="bills" className="space-y-4">
          <TabsList>
            <TabsTrigger value="bills">Medical Bills</TabsTrigger>
            <TabsTrigger value="coverage">Coverage Details</TabsTrigger>
          </TabsList>

          <TabsContent value="bills" className="space-y-4">
            {bills.map((bill) => (
              <Card key={bill.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center">
                        <CreditCard className="h-5 w-5 mr-2 text-primary" />
                        Invoice {bill.invoiceNumber}
                      </CardTitle>
                      <CardDescription>
                        Date: {new Date(bill.date).toLocaleDateString()} • Due:{" "}
                        {new Date(bill.dueDate).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <Badge
                      variant={
                        bill.status === "paid" ? "default" : bill.status === "pending" ? "secondary" : "destructive"
                      }
                    >
                      {bill.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Bill Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                    <div className="text-center">
                      <p className="text-sm font-medium text-foreground">Total Amount</p>
                      <p className="text-lg font-bold">${bill.totalAmount}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-foreground">Insurance Covered</p>
                      <p className="text-lg font-bold text-green-600">${bill.coveredAmount}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-foreground">Your Responsibility</p>
                      <p className="text-lg font-bold text-red-600">${bill.patientAmount}</p>
                    </div>
                  </div>

                  {/* Treatments */}
                  <div>
                    <h4 className="font-medium text-foreground mb-3">Services & Treatments</h4>
                    <div className="space-y-2">
                      {bill.treatments.map((treatment) => (
                        <div
                          key={treatment.id}
                          className="flex items-center justify-between p-3 border border-border rounded-lg"
                        >
                          <div className="flex items-center space-x-3">
                            {treatment.covered ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-red-600" />
                            )}
                            <div>
                              <p className="font-medium text-foreground">{treatment.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(treatment.date).toLocaleDateString()} • Code: {treatment.code}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-foreground">${treatment.cost}</p>
                            <Badge variant={treatment.covered ? "default" : "secondary"}>
                              {treatment.covered ? "Covered" : "Not Covered"}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Download PDF
                    </Button>
                    {bill.status !== "paid" && (
                      <Button size="sm">
                        <CreditCard className="h-4 w-4 mr-2" />
                        Pay Now
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="coverage" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="h-5 w-5 mr-2 text-primary" />
                  Current Treatment Coverage
                </CardTitle>
                <CardDescription>How your insurance covers your current treatment plan</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Coverage Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                  <div className="text-center">
                    <p className="text-sm font-medium text-foreground">Plan Total</p>
                    <p className="text-lg font-bold">${mockPatientTreatmentPlan.totalCost}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-foreground">Insurance Covers</p>
                    <p className="text-lg font-bold text-green-600">${mockPatientTreatmentPlan.coveredAmount}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-foreground">Your Cost</p>
                    <p className="text-lg font-bold text-red-600">${mockPatientTreatmentPlan.uncoveredAmount}</p>
                  </div>
                </div>

                {/* Coverage Details */}
                <div>
                  <h4 className="font-medium text-foreground mb-3">Coverage Breakdown</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <div>
                          <p className="font-medium text-green-800">Physical Therapy</p>
                          <p className="text-sm text-green-600">80% coverage after deductible</p>
                        </div>
                      </div>
                      <Badge variant="default">Covered</Badge>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <div>
                          <p className="font-medium text-green-800">MRI Scan</p>
                          <p className="text-sm text-green-600">70% coverage with pre-authorization</p>
                        </div>
                      </div>
                      <Badge variant="default">Covered</Badge>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        <div>
                          <p className="font-medium text-red-800">X-Ray</p>
                          <p className="text-sm text-red-600">Coverage removed from plan effective Jan 1, 2024</p>
                        </div>
                      </div>
                      <Badge variant="destructive">Not Covered</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </RoleBasedLayout>
  )
}
