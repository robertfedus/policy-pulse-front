export interface EmailNotification {
  id: string
  recipientId: string
  recipientEmail: string
  recipientName: string
  type: "policy_change" | "treatment_update" | "bill_reminder" | "appointment_reminder" | "insurer_update"
  subject: string
  content: string
  sentDate: string
  status: "sent" | "pending" | "failed"
  templateId: string
}

export interface NotificationTemplate {
  id: string
  name: string
  type: EmailNotification["type"]
  subject: string
  content: string
  variables: string[]
}

export interface PolicyChangeNotification {
  id: string
  policyId: string
  patientId: string
  changeType: "coverage_added" | "coverage_removed" | "premium_change" | "deductible_change"
  changeDescription: string
  effectiveDate: string
  affectedTreatments: string[]
  notificationSent: boolean
  emailId?: string
  createdDate: string
}

export interface SystemNotification {
  id: string
  userId: string
  userRole: "hospital" | "patient"
  type: "policy_update" | "treatment_approval" | "payment_received" | "system_maintenance" | "insurer_update"
  title: string
  message: string
  priority: "low" | "medium" | "high" | "urgent"
  read: boolean
  actionRequired: boolean
  actionUrl?: string
  createdDate: string
  expiryDate?: string
}
