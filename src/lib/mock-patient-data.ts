import type {
  PatientTreatmentPlan,
  PatientTreatment,
  PatientBill,
  PatientPolicy,
  CoverageDetail,
  InsuranceCompany,
  PatientVisit,
  PatientIncident,
} from "@/types/patient"

export const mockPatientTreatments: PatientTreatment[] = [
  {
    id: "pt-001",
    name: "Physical Therapy Session",
    code: "PT001",
    date: "2024-01-15",
    cost: 150,
    covered: true,
    status: "completed",
  },
  {
    id: "pt-002",
    name: "MRI Scan",
    code: "MRI001",
    date: "2024-01-10",
    cost: 1200,
    covered: true,
    status: "completed",
  },
  {
    id: "pt-003",
    name: "X-Ray",
    code: "XRAY001",
    date: "2024-01-05",
    cost: 200,
    covered: false,
    status: "completed",
    removed: true,
    removedReason: "Policy change - X-Ray coverage removed from basic plan",
    removedDate: "2024-01-01",
  },
  {
    id: "pt-004",
    name: "Follow-up Consultation",
    code: "CONS002",
    date: "2024-01-20",
    cost: 200,
    covered: true,
    status: "scheduled",
  },
]

export const mockPatientTreatmentPlan: PatientTreatmentPlan = {
  id: "ptp-001",
  title: "Post-Surgery Knee Rehabilitation",
  description:
    "Comprehensive 8-week rehabilitation program following arthroscopic knee surgery to restore mobility and strength.",
  startDate: "2024-01-01",
  endDate: "2024-03-01",
  status: "active",
  progress: 37.5, // 3 weeks out of 8
  treatments: mockPatientTreatments,
  totalCost: 1750,
  coveredAmount: 1350,
  uncoveredAmount: 400,
  doctorName: "Dr. Sarah Johnson",
  hospitalName: "City General Hospital",
}

export const mockCoverageDetails: CoverageDetail[] = [
  {
    category: "Preventive Care",
    description: "Annual checkups, vaccinations, screenings",
    coveragePercentage: 100,
  },
  {
    category: "Emergency Services",
    description: "Emergency room visits, ambulance services",
    coveragePercentage: 80,
    limitations: "After deductible",
  },
  {
    category: "Specialist Visits",
    description: "Consultations with specialists",
    coveragePercentage: 70,
    limitations: "Referral required",
  },
  {
    category: "Physical Therapy",
    description: "Rehabilitation and physical therapy sessions",
    coveragePercentage: 80,
    limitations: "Up to 20 sessions per year",
  },
  {
    category: "Diagnostic Imaging",
    description: "MRI, CT scans, ultrasounds",
    coveragePercentage: 70,
    limitations: "Pre-authorization required for MRI/CT",
  },
]

export const mockPatientPolicy: PatientPolicy = {
  id: "pp-001",
  insuranceProvider: "BlueCross BlueShield",
  policyNumber: "BC123456789",
  planName: "Premium Health Plan",
  effectiveDate: "2023-01-01",
  expirationDate: "2024-12-31",
  status: "active",
  coverageDetails: mockCoverageDetails,
  deductible: 1500,
  copay: 25,
  outOfPocketMax: 6000,
}

export const mockPatientBills: PatientBill[] = [
  {
    id: "pb-001",
    invoiceNumber: "INV-2024-001",
    date: "2024-01-15",
    dueDate: "2024-02-15",
    totalAmount: 1550,
    coveredAmount: 1350,
    patientAmount: 200,
    status: "pending",
    treatments: [mockPatientTreatments[0], mockPatientTreatments[1]],
    insuranceProvider: "BlueCross BlueShield",
  },
  {
    id: "pb-002",
    invoiceNumber: "INV-2024-002",
    date: "2024-01-05",
    dueDate: "2024-02-05",
    totalAmount: 200,
    coveredAmount: 0,
    patientAmount: 200,
    status: "paid",
    treatments: [mockPatientTreatments[2]],
    insuranceProvider: "BlueCross BlueShield",
  },
]

export const mockInsuranceCompanies: InsuranceCompany[] = [
  {
    id: "ic-001",
    name: "BlueCross BlueShield",
    contactPhone: "1-800-BCBS-123",
    contactEmail: "support@bcbs.com",
    website: "https://www.bcbs.com",
    policies: [mockPatientPolicy],
    customerServiceHours: "24/7",
  },
  {
    id: "ic-002",
    name: "Aetna",
    contactPhone: "1-800-AETNA-01",
    contactEmail: "help@aetna.com",
    website: "https://www.aetna.com",
    policies: [],
    customerServiceHours: "Mon-Fri 8AM-8PM EST",
  },
]

export const mockPatientVisits: PatientVisit[] = [
  {
    id: "pv-001",
    date: "2024-01-15",
    type: "follow-up",
    doctorName: "Dr. Sarah Johnson",
    department: "Orthopedics",
    diagnosis: "Post-surgical knee rehabilitation",
    treatments: [mockPatientTreatments[0]],
    invoiceId: "pb-001",
    totalCost: 150,
    notes: "Good progress, continue with physical therapy",
  },
  {
    id: "pv-002",
    date: "2024-01-10",
    type: "routine",
    doctorName: "Dr. Michael Brown",
    department: "Radiology",
    diagnosis: "Knee assessment",
    treatments: [mockPatientTreatments[1]],
    invoiceId: "pb-001",
    totalCost: 1200,
    notes: "MRI shows healing progress",
  },
  {
    id: "pv-003",
    date: "2024-01-05",
    type: "emergency",
    doctorName: "Dr. Emily Davis",
    department: "Emergency",
    diagnosis: "Knee injury assessment",
    treatments: [mockPatientTreatments[2]],
    invoiceId: "pb-002",
    totalCost: 200,
    notes: "Initial X-ray for injury assessment",
  },
]

export const mockPatientIncidents: PatientIncident[] = [
  {
    id: "pi-001",
    date: "2024-01-05",
    type: "injury",
    description: "Knee injury during sports activity",
    location: "Local Sports Center",
    visits: mockPatientVisits,
    totalCost: 1550,
    insuranceClaim: "CLM-2024-001",
    status: "open",
  },
]
