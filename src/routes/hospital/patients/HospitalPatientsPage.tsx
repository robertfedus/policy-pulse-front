import { useState } from "react"
import { RoleBasedLayout } from "@/components/layout/role-based-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, Eye, Phone, Mail, Calendar } from "lucide-react"
import { mockPatients } from "@/lib/mock-hospital-data"
import type { Patient } from "@/types/hospital"

export default function PatientsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [patients] = useState<Patient[]>(mockPatients)

  const filteredPatients = patients.filter(
    (patient) =>
      patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.policyNumber.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <RoleBasedLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Patient Management</h1>
          <p className="text-muted-foreground mt-2">Search and manage patient records and information.</p>
        </div>

        {/* Search Bar */}
        <Card>
          <CardHeader>
            <CardTitle>Search Patients</CardTitle>
            <CardDescription>Find patients by name, email, or policy number</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" aria-hidden="true" />
              <Input
                placeholder="Search patients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                aria-label="Search patients"
              />
            </div>
          </CardContent>
        </Card>

        {/* Patient List */}
        <div className="grid gap-4">
          {filteredPatients.map((patient) => (
            <Card key={patient.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4">
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">{patient.name}</h3>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
                          <div className="flex items-center">
                            <Mail className="h-4 w-4 mr-1" aria-hidden="true" />
                            {patient.email}
                          </div>
                          <div className="flex items-center">
                            <Phone className="h-4 w-4 mr-1" aria-hidden="true" />
                            {patient.phone}
                          </div>
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" aria-hidden="true" />
                            DOB: {new Date(patient.dateOfBirth).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-x-8 gap-y-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">Insurance Provider</p>
                        <p className="text-sm text-muted-foreground">{patient.insuranceProvider}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Policy Number</p>
                        <p className="text-sm text-muted-foreground">{patient.policyNumber}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Last Visit</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(patient.lastVisit).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 ml-4">
                    <Badge variant={patient.status === "active" ? "default" : "secondary"}>{patient.status}</Badge>
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-2" aria-hidden="true" />
                      View Details
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredPatients.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">No patients found matching your search criteria.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </RoleBasedLayout>
  )
}
