import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Building2, Phone, Mail, Globe, Clock, Shield } from "lucide-react"
import { mockInsuranceCompanies } from "@/lib/mock-patient-data"
import type { InsuranceCompany } from "@/types/patient"
import { RoleBasedLayout } from "@/components/layout/role-based-layout"

export default function PatientInsurersPage() {
  const [insurers] = useState<InsuranceCompany[]>(mockInsuranceCompanies)

  return (
    <RoleBasedLayout>
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Insurance Companies</h1>
        <p className="text-muted-foreground mt-2">View your insurance providers and their contact information.</p>
      </div>

      <div className="grid gap-6">
        {insurers.map((insurer) => (
          <Card key={insurer.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center">
                    <Building2 className="h-5 w-5 mr-2 text-primary" />
                    {insurer.name}
                  </CardTitle>
                  <CardDescription>
                    {insurer.policies.length > 0
                      ? `${insurer.policies.length} active policy(ies)`
                      : "No active policies"}
                  </CardDescription>
                </div>
                <Badge variant={insurer.policies.length > 0 ? "default" : "secondary"}>
                  {insurer.policies.length > 0 ? "Active" : "Inactive"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Contact Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="flex items-center space-x-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Phone</p>
                    <p className="text-sm text-muted-foreground">{insurer.contactPhone}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Email</p>
                    <p className="text-sm text-muted-foreground">{insurer.contactEmail}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Website</p>
                    <a
                      href={insurer.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      Visit Website
                    </a>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Support Hours</p>
                    <p className="text-sm text-muted-foreground">{insurer.customerServiceHours}</p>
                  </div>
                </div>
              </div>

              {/* Policies */}
              {insurer.policies.length > 0 && (
                <div>
                  <h4 className="font-medium text-foreground mb-3 flex items-center">
                    <Shield className="h-4 w-4 mr-2" />
                    Your Policies
                  </h4>
                  <div className="space-y-3">
                    {insurer.policies.map((policy) => (
                      <div key={policy.id} className="p-4 border border-border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-medium text-foreground">{policy.planName}</h5>
                          <Badge variant={policy.status === "active" ? "default" : "secondary"}>{policy.status}</Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="font-medium text-foreground">Policy Number</p>
                            <p className="text-muted-foreground">{policy.policyNumber}</p>
                          </div>
                          <div>
                            <p className="font-medium text-foreground">Coverage Period</p>
                            <p className="text-muted-foreground">
                              {new Date(policy.effectiveDate).toLocaleDateString()} -{" "}
                              {new Date(policy.expirationDate).toLocaleDateString()}
                            </p>
                          </div>
                          <div>
                            <p className="font-medium text-foreground">Deductible</p>
                            <p className="text-muted-foreground">${policy.deductible}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm">
                  <Phone className="h-4 w-4 mr-2" />
                  Call Support
                </Button>
                <Button variant="outline" size="sm">
                  <Mail className="h-4 w-4 mr-2" />
                  Send Email
                </Button>
                <Button variant="outline" size="sm">
                  <Globe className="h-4 w-4 mr-2" />
                  Member Portal
                </Button>
                {insurer.policies.length > 0 && (
                  <Button variant="outline" size="sm">
                    <Shield className="h-4 w-4 mr-2" />
                    View Policy Details
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle>Need Help?</CardTitle>
          <CardDescription>Common questions and support resources</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-foreground mb-3">Quick Links</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#" className="text-primary hover:underline">
                    Find a Provider
                  </a>
                </li>
                <li>
                  <a href="#" className="text-primary hover:underline">
                    Check Coverage
                  </a>
                </li>
                <li>
                  <a href="#" className="text-primary hover:underline">
                    Submit a Claim
                  </a>
                </li>
                <li>
                  <a href="#" className="text-primary hover:underline">
                    Request Prior Authorization
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-foreground mb-3">Emergency Contacts</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• For medical emergencies: Call 911</li>
                <li>• For urgent care authorization: Call your insurer</li>
                <li>• For claims questions: Use member portal or call support</li>
                <li>• For policy changes: Contact your HR department</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
    </RoleBasedLayout>
  )
}
