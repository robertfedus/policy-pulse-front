"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Send, Users, Mail, CheckCircle } from "lucide-react"
import { mockPatients } from "@/lib/mock-hospital-data"
import { NotificationService } from "@/lib/notification-service"
import type { PolicyChangeNotification } from "@/types/notifications"

interface PolicyChangeWizardProps {
  isOpen: boolean
  onClose: () => void
}

export function PolicyChangeWizard({ isOpen, onClose }: PolicyChangeWizardProps) {
  const [step, setStep] = useState(1)
  const [selectedPatients, setSelectedPatients] = useState<string[]>([])
  const [changeType, setChangeType] = useState<PolicyChangeNotification["changeType"]>("coverage_removed")
  const [changeDescription, setChangeDescription] = useState("")
  const [effectiveDate, setEffectiveDate] = useState("")
  const [affectedTreatments, setAffectedTreatments] = useState<string[]>([])
  const [customTreatment, setCustomTreatment] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [notificationsSent, setNotificationsSent] = useState<string[]>([])

  const treatmentOptions = [
    "X-Ray Imaging",
    "Physical Therapy",
    "MRI Scan",
    "CT Scan",
    "Blood Tests",
    "Specialist Consultations",
    "Emergency Services",
    "Prescription Medications",
  ]

  const handlePatientSelection = (patientId: string, checked: boolean) => {
    if (checked) {
      setSelectedPatients((prev) => [...prev, patientId])
    } else {
      setSelectedPatients((prev) => prev.filter((id) => id !== patientId))
    }
  }

  const handleTreatmentSelection = (treatment: string, checked: boolean) => {
    if (checked) {
      setAffectedTreatments((prev) => [...prev, treatment])
    } else {
      setAffectedTreatments((prev) => prev.filter((t) => t !== treatment))
    }
  }

  const addCustomTreatment = () => {
    if (customTreatment && !affectedTreatments.includes(customTreatment)) {
      setAffectedTreatments((prev) => [...prev, customTreatment])
      setCustomTreatment("")
    }
  }

  const sendNotifications = async () => {
    setIsProcessing(true)
    const sentNotifications: string[] = []

    try {
      for (const patientId of selectedPatients) {
        const patient = mockPatients.find((p) => p.id === patientId)
        if (patient) {
          await NotificationService.sendPolicyChangeNotification(
            patient,
            changeType,
            changeDescription,
            effectiveDate,
            affectedTreatments,
          )

          await NotificationService.createSystemNotification(
            patient.id,
            "patient",
            "policy_update",
            "Important Policy Change",
            `Your insurance policy has been updated. ${changeDescription}`,
            changeType === "coverage_removed" ? "urgent" : "medium",
            true,
            "/patient/policies",
          )

          sentNotifications(patient.name)
        }
      }

      setNotificationsSent(sentNotifications)
      setStep(4)
    } catch (error) {
      console.error("Error sending notifications:", error)
    } finally {
      setIsProcessing(false)
    }
  }

  const resetWizard = () => {
    setStep(1)
    setSelectedPatients([])
    setChangeType("coverage_removed")
    setChangeDescription("")
    setEffectiveDate("")
    setAffectedTreatments([])
    setCustomTreatment("")
    setNotificationsSent([])
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Mail className="h-5 w-5 mr-2" />
            Policy Change Notification
          </CardTitle>
          <CardDescription>Step {step} of 4: Notify patients about insurance policy changes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Select Affected Patients</h3>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {mockPatients.map((patient) => (
                  <div key={patient.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                    <Checkbox
                      id={patient.id}
                      checked={selectedPatients.includes(patient.id)}
                      onCheckedChange={(checked) => handlePatientSelection(patient.id, !!checked)}
                    />
                    <div className="flex-1">
                      <p className="font-medium">{patient.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {patient.insuranceProvider} • {patient.policyNumber}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{selectedPatients.length} patients selected</p>
                <div className="space-x-2">
                  <Button variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button onClick={() => setStep(2)} disabled={selectedPatients.length === 0}>
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Policy Change Details</h3>

              <div className="space-y-2">
                <Label htmlFor="changeType">Change Type</Label>
                <Select value={changeType} onValueChange={(value: any) => setChangeType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="coverage_removed">Coverage Removed</SelectItem>
                    <SelectItem value="coverage_added">Coverage Added</SelectItem>
                    <SelectItem value="premium_change">Premium Change</SelectItem>
                    <SelectItem value="deductible_change">Deductible Change</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="effectiveDate">Effective Date</Label>
                <Input
                  id="effectiveDate"
                  type="date"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="changeDescription">Change Description</Label>
                <Textarea
                  id="changeDescription"
                  placeholder="Describe the policy change and its impact..."
                  value={changeDescription}
                  onChange={(e) => setChangeDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex items-center justify-between">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button onClick={() => setStep(3)} disabled={!changeDescription || !effectiveDate}>
                  Next
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Affected Treatments (Optional)</h3>
              <p className="text-sm text-muted-foreground">Select treatments that are affected by this policy change</p>

              <div className="space-y-3">
                {treatmentOptions.map((treatment) => (
                  <div key={treatment} className="flex items-center space-x-3">
                    <Checkbox
                      id={treatment}
                      checked={affectedTreatments.includes(treatment)}
                      onCheckedChange={(checked) => handleTreatmentSelection(treatment, !!checked)}
                    />
                    <Label htmlFor={treatment}>{treatment}</Label>
                  </div>
                ))}
              </div>

              <div className="flex space-x-2">
                <Input
                  placeholder="Add custom treatment..."
                  value={customTreatment}
                  onChange={(e) => setCustomTreatment(e.target.value)}
                />
                <Button variant="outline" onClick={addCustomTreatment}>
                  Add
                </Button>
              </div>

              {affectedTreatments.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Selected Treatments:</p>
                  <div className="flex flex-wrap gap-2">
                    {affectedTreatments.map((treatment) => (
                      <Badge key={treatment} variant="secondary">
                        {treatment}
                        <button
                          onClick={() => setAffectedTreatments((prev) => prev.filter((t) => t !== treatment))}
                          className="ml-2 text-xs"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <Alert>
                <Users className="h-4 w-4" />
                <AlertDescription>
                  Ready to send notifications to {selectedPatients.length} patients about this policy change.
                </AlertDescription>
              </Alert>

              <div className="flex items-center justify-between">
                <Button variant="outline" onClick={() => setStep(2)}>
                  Back
                </Button>
                <Button onClick={sendNotifications} disabled={isProcessing}>
                  {isProcessing ? (
                    <>
                      <Send className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Notifications
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4 text-center">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
              <h3 className="text-lg font-medium">Notifications Sent Successfully!</h3>
              <p className="text-muted-foreground">
                Policy change notifications have been sent to {notificationsSent.length} patients.
              </p>

              <div className="space-y-2">
                <p className="text-sm font-medium">Notifications sent to:</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {notificationsSent.map((patientName) => (
                    <Badge key={patientName} variant="default">
                      {patientName}
                    </Badge>
                  ))}
                </div>
              </div>

              <Alert>
                <Mail className="h-4 w-4" />
                <AlertDescription>
                  Email notifications have been sent and system notifications have been created for all affected
                  patients.
                </AlertDescription>
              </Alert>

              <Button onClick={resetWizard} className="w-full">
                Close
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
