import type { Patient, TreatmentPlan, Treatment, PolicyHistory, Notification } from "@/types/hospital"

export const mockPatients: Patient[] = [
  {
    id: "pat-001",
    name: "John Smith",
    email: "john.smith@email.com",
    phone: "(555) 123-4567",
    dateOfBirth: "1985-03-15",
    insuranceProvider: "BlueCross BlueShield",
    policyNumber: "BC123456789",
    status: "active",
    lastVisit: "2024-01-15",
  },
  {
    id: "pat-002",
    name: "Sarah Johnson",
    email: "sarah.johnson@email.com",
    phone: "(555) 987-6543",
    dateOfBirth: "1978-07-22",
    insuranceProvider: "Aetna",
    policyNumber: "AET987654321",
    status: "active",
    lastVisit: "2024-01-10",
  },
  {
    id: "pat-003",
    name: "Michael Brown",
    email: "michael.brown@email.com",
    phone: "(555) 456-7890",
    dateOfBirth: "1992-11-08",
    insuranceProvider: "Cigna",
    policyNumber: "CIG456789123",
    status: "inactive",
    lastVisit: "2023-12-20",
  },
]

export const mockTreatments: Treatment[] = [
  { id: "t1", name: "Physical Therapy Session", code: "PT001", cost: 150, covered: true },
  { id: "t2", name: "MRI Scan", code: "MRI001", cost: 1200, covered: true },
  { id: "t3", name: "Blood Test Panel", code: "LAB001", cost: 250, covered: true },
  { id: "t4", name: "Specialist Consultation", code: "CONS001", cost: 300, covered: false },
  {
    id: "t5",
    name: "X-Ray",
    code: "XRAY001",
    cost: 200,
    covered: true,
    removed: true,
    removedReason: "Policy change - no longer covered",
    removedDate: "2024-01-01",
  },
]

export const mockTreatmentPlans: TreatmentPlan[] = [
  {
    id: "tp-001",
    patientId: "pat-001",
    patientName: "John Smith",
    title: "Post-Surgery Rehabilitation",
    description: "Comprehensive rehabilitation program following knee surgery",
    startDate: "2024-01-01",
    endDate: "2024-03-01",
    status: "active",
    treatments: [mockTreatments[0], mockTreatments[1], mockTreatments[4]],
    totalCost: 1550,
    coveredAmount: 1350,
    uncoveredAmount: 200,
  },
  {
    id: "tp-002",
    patientId: "pat-002",
    patientName: "Sarah Johnson",
    title: "Cardiac Monitoring Program",
    description: "Regular monitoring and treatment for cardiac condition",
    startDate: "2023-12-01",
    endDate: "2024-06-01",
    status: "active",
    treatments: [mockTreatments[2], mockTreatments[3]],
    totalCost: 550,
    coveredAmount: 250,
    uncoveredAmount: 300,
  },
]

export const mockPolicyHistory: PolicyHistory[] = [
  {
    id: "ph-001",
    patientId: "pat-001",
    insuranceProvider: "BlueCross BlueShield",
    policyNumber: "BC123456789",
    effectiveDate: "2023-01-01",
    expirationDate: "2024-12-31",
    status: "active",
    changes: [
      {
        id: "pc-001",
        changeDate: "2024-01-01",
        changeType: "coverage_removed",
        description: "X-Ray coverage removed from basic plan",
        affectedTreatments: ["XRAY001"],
      },
      {
        id: "pc-002",
        changeDate: "2023-06-01",
        changeType: "coverage_added",
        description: "Physical therapy coverage increased to 20 sessions per year",
        affectedTreatments: ["PT001"],
      },
    ],
  },
]

export const mockNotifications: Notification[] = [
  {
    id: "n-001",
    type: "policy_update",
    title: "Policy Update - BlueCross BlueShield",
    message: "X-Ray coverage has been removed from basic plans effective January 1, 2024",
    date: "2024-01-01T09:00:00Z",
    read: false,
    patientId: "pat-001",
    urgent: true,
  },
  {
    id: "n-002",
    type: "treatment_approval",
    title: "Treatment Approved",
    message: "MRI scan for John Smith has been approved by insurance",
    date: "2024-01-10T14:30:00Z",
    read: true,
    patientId: "pat-001",
    urgent: false,
  },
  {
    id: "n-003",
    type: "insurer_update",
    title: "Aetna System Maintenance",
    message: "Aetna will undergo system maintenance on January 20, 2024. Claims processing may be delayed.",
    date: "2024-01-15T08:00:00Z",
    read: false,
    urgent: false,
  },
]
