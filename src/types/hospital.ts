export interface Patient {
  id: string
  name: string
  email: string
  phone: string
  dateOfBirth: string
  insuranceProvider: string
  policyNumber: string
  status: "active" | "inactive"
  lastVisit: string
}

export interface TreatmentPlan {
  id: string
  patientId: string
  patientName: string
  title: string
  description: string
  startDate: string
  endDate: string
  status: "active" | "completed" | "cancelled"
  treatments: Treatment[]
  totalCost: number
  coveredAmount: number
  uncoveredAmount: number
}

export interface Treatment {
  id: string
  name: string
  code: string
  cost: number
  covered: boolean
  removed?: boolean
  removedReason?: string
  removedDate?: string
}

export interface PolicyHistory {
  id: string
  patientId: string
  insuranceProvider: string
  policyNumber: string
  effectiveDate: string
  expirationDate: string
  changes: PolicyChange[]
  status: "active" | "expired" | "cancelled"
}

export interface PolicyChange {
  id: string
  changeDate: string
  changeType: "coverage_added" | "coverage_removed" | "premium_change" | "deductible_change"
  description: string
  affectedTreatments?: string[]
}

export interface Notification {
  id: string
  type: "policy_update" | "insurer_update" | "treatment_approval" | "payment_received"
  title: string
  message: string
  date: string
  read: boolean
  patientId?: string
  urgent: boolean
}
