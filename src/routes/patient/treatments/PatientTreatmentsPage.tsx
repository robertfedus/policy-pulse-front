import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { FileText, Calendar, User, Building, AlertTriangle, CheckCircle, Clock, XCircle, Activity } from "lucide-react"
import { RoleBasedLayout } from "@/components/layout/role-based-layout"

export default function PatientTreatmentsPage() {
  const { user } = useAuth()

  const illnesses = user?.illnesses ?? []

  // If you still want to keep mock treatments for now:
  // const [treatmentPlan] = useState<PatientTreatmentPlan>(mockPatientTreatmentPlan)
  // const removedTreatments = treatmentPlan.treatments.filter((t) => t.removed)
  // const activeTreatments = treatmentPlan.treatments.filter((t) => !t.removed)

  return (
    <RoleBasedLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Treatments & Conditions</h1>
          <p className="text-muted-foreground mt-2">
            View your current illnesses and treatments associated with your insurance policies.
          </p>
        </div>

        {/* Illnesses Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="h-5 w-5 mr-2 text-primary" />
              My Illnesses
            </CardTitle>
            <CardDescription>Conditions recorded in your profile</CardDescription>
          </CardHeader>
          <CardContent>
            {illnesses.length === 0 ? (
              <p className="text-sm text-muted-foreground">No illnesses recorded.</p>
            ) : (
              <div className="space-y-4">
                {illnesses.map((ill: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-4 border border-border rounded-lg bg-muted/40 space-y-2"
                  >
                    <h4 className="font-medium text-foreground">{ill.name}</h4>
                    {ill.medications?.length ? (
                      <div>
                        <p className="text-sm text-muted-foreground">Medications:</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {ill.medications.map((med: string, i: number) => (
                            <Badge key={i} variant="outline">
                              {med}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No medications listed.</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Example: If you still want to show alerts for removed treatments */}
        {/* {removedTreatments.length > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {removedTreatments.length} treatment(s) have been removed from your plan due to policy changes.
            </AlertDescription>
          </Alert>
        )} */}
      </div>
    </RoleBasedLayout>
  )
}
