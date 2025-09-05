"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, User, Building, FileText, AlertTriangle, Eye, Download } from "lucide-react"
import { mockPatientVisits, mockPatientIncidents } from "@/lib/mock-patient-data"
import type { PatientVisit, PatientIncident } from "@/types/patient"

export default function PatientVisitsPage() {
  const [visits] = useState<PatientVisit[]>(mockPatientVisits)
  const [incidents] = useState<PatientIncident[]>(mockPatientIncidents)

  const getVisitTypeColor = (type: PatientVisit["type"]) => {
    switch (type) {
      case "emergency":
        return "destructive"
      case "specialist":
        return "secondary"
      case "follow-up":
        return "default"
      case "routine":
        return "outline"
      default:
        return "outline"
    }
  }

  const getIncidentTypeColor = (type: PatientIncident["type"]) => {
    switch (type) {
      case "emergency":
        return "destructive"
      case "accident":
        return "secondary"
      case "injury":
        return "default"
      case "illness":
        return "outline"
      default:
        return "outline"
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Visits & Incidents</h1>
        <p className="text-muted-foreground mt-2">View your medical visits, incidents, and associated invoices.</p>
      </div>

      <Tabs defaultValue="visits" className="space-y-4">
        <TabsList>
          <TabsTrigger value="visits">Medical Visits</TabsTrigger>
          <TabsTrigger value="incidents">Incidents</TabsTrigger>
        </TabsList>

        <TabsContent value="visits" className="space-y-4">
          {visits.map((visit) => (
            <Card key={visit.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center">
                      <Calendar className="h-5 w-5 mr-2 text-primary" />
                      {visit.department} Visit
                    </CardTitle>
                    <CardDescription>
                      {new Date(visit.date).toLocaleDateString()} • {visit.doctorName}
                    </CardDescription>
                  </div>
                  <Badge variant={getVisitTypeColor(visit.type)}>{visit.type}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Visit Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center space-x-3">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Doctor</p>
                      <p className="text-sm text-muted-foreground">{visit.doctorName}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Department</p>
                      <p className="text-sm text-muted-foreground">{visit.department}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Total Cost</p>
                      <p className="text-sm text-muted-foreground">${visit.totalCost}</p>
                    </div>
                  </div>
                </div>

                {/* Diagnosis */}
                <div className="p-3 bg-muted rounded-lg">
                  <h4 className="font-medium text-foreground mb-1">Diagnosis</h4>
                  <p className="text-sm text-muted-foreground">{visit.diagnosis}</p>
                  {visit.notes && (
                    <div className="mt-2">
                      <h5 className="text-xs font-medium text-foreground">Notes</h5>
                      <p className="text-xs text-muted-foreground">{visit.notes}</p>
                    </div>
                  )}
                </div>

                {/* Treatments */}
                <div>
                  <h4 className="font-medium text-foreground mb-3">Treatments & Services</h4>
                  <div className="space-y-2">
                    {visit.treatments.map((treatment) => (
                      <div
                        key={treatment.id}
                        className="flex items-center justify-between p-3 border border-border rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-foreground">{treatment.name}</p>
                          <p className="text-xs text-muted-foreground">Code: {treatment.code}</p>
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
                  {visit.invoiceId && (
                    <>
                      <Button variant="outline" size="sm">
                        <FileText className="h-4 w-4 mr-2" />
                        View Invoice
                      </Button>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="incidents" className="space-y-4">
          {incidents.map((incident) => (
            <Card key={incident.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center">
                      <AlertTriangle className="h-5 w-5 mr-2 text-primary" />
                      {incident.description}
                    </CardTitle>
                    <CardDescription>
                      {new Date(incident.date).toLocaleDateString()} • {incident.location}
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={getIncidentTypeColor(incident.type)}>{incident.type}</Badge>
                    <Badge
                      variant={
                        incident.status === "closed" ? "default" : incident.status === "open" ? "secondary" : "outline"
                      }
                    >
                      {incident.status}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Incident Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                  <div className="text-center">
                    <p className="text-sm font-medium text-foreground">Total Visits</p>
                    <p className="text-lg font-bold">{incident.visits.length}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-foreground">Total Cost</p>
                    <p className="text-lg font-bold">${incident.totalCost}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-foreground">Insurance Claim</p>
                    <p className="text-lg font-bold">{incident.insuranceClaim || "N/A"}</p>
                  </div>
                </div>

                {/* Related Visits */}
                <div>
                  <h4 className="font-medium text-foreground mb-3">Related Visits</h4>
                  <div className="space-y-2">
                    {incident.visits.map((visit) => (
                      <div
                        key={visit.id}
                        className="flex items-center justify-between p-3 border border-border rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-foreground">
                              {visit.department} - {visit.doctorName}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(visit.date).toLocaleDateString()} • {visit.diagnosis}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-foreground">${visit.totalCost}</p>
                          <Badge variant={getVisitTypeColor(visit.type)}>{visit.type}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-2" />
                    View Full Details
                  </Button>
                  {incident.insuranceClaim && (
                    <Button variant="outline" size="sm">
                      <FileText className="h-4 w-4 mr-2" />
                      View Claim Status
                    </Button>
                  )}
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Download Records
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  )
}
