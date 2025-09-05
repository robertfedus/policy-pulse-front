export interface PatientTreatmentPlan {
  id: string
  title: string
  description: string
  startDate: string
  endDate: string
  status: "active" | "completed" | "cancelled"
  progress: number
  treatments: PatientTreatment[]
  totalCost: number
  coveredAmount: number
  uncoveredAmount: number
  doctorName: string
  hospitalName: string
}

export interface PatientTreatment {
  id: string
  name: string
  code: string
  date: string
  cost: number
  covered: boolean
  status: "completed" | "scheduled" | "cancelled"
  removed?: boolean
  removedReason?: string
  removedDate?: string
}

export interface PatientBill {
  id: string
  invoiceNumber: string
  date: string
  dueDate: string
  totalAmount: number
  coveredAmount: number
  patientAmount: number
  status: "paid" | "pending" | "overdue"
  treatments: PatientTreatment[]
  insuranceProvider: string
}

export interface PatientPolicy {
  id: string
  insuranceProvider: string
  policyNumber: string
  planName: string
  effectiveDate: string
  expirationDate: string
  status: "active" | "expired"
  coverageDetails: CoverageDetail[]
  deductible: number
  copay: number
  outOfPocketMax: number
}

export interface CoverageDetail {
  category: string
  description: string
  coveragePercentage: number
  limitations?: string
}

export interface InsuranceCompany {
  id: string
  name: string
  contactPhone: string
  contactEmail: string
  website: string
  policies: PatientPolicy[]
  customerServiceHours: string
}

export interface PatientVisit {
  id: string
  date: string
  type: "routine" | "emergency" | "follow-up" | "specialist"
  doctorName: string
  department: string
  diagnosis: string
  treatments: PatientTreatment[]
  invoiceId?: string
  totalCost: number
  notes?: string
}

export interface PatientIncident {
  id: string
  date: string
  type: "accident" | "illness" | "injury" | "emergency"
  description: string
  location: string
  visits: PatientVisit[]
  totalCost: number
  insuranceClaim?: string
  status: "open" | "closed" | "pending"
}
