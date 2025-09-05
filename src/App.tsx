
import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/contexts/auth-context'
import './index.css'
import HomePage from './routes/HomePage'
import HospitalPage from './routes/hospital/HospitalPage'
import HospitalPatientsPage from './routes/hospital/patients/HospitalPatientsPage'
import HospitalTreatmentsPage from './routes/hospital/treatments/HospitalTreatmentsPage'
import HospitalPoliciesPage from './routes/hospital/policies/HospitalPoliciesPage'
import HospitalNotificationsPage from './routes/hospital/notifications/HospitalNotificationsPage'
import PatientPage from './routes/patient/PatientPage'
import PatientTreatmentsPage from './routes/patient/treatments/PatientTreatmentsPage'
import PatientBillingPage from './routes/patient/billing/PatientBillingPage'
import PatientPoliciesPage from './routes/patient/policies/PatientPoliciesPage'
import PatientInsurersPage from './routes/patient/insurers/PatientInsurersPage'
import PatientVisitsPage from './routes/patient/visits/PatientVisitsPage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/hospital" element={<HospitalPage />} />
        <Route path="/hospital/patients" element={<HospitalPatientsPage />} />
        <Route path="/hospital/treatments" element={<HospitalTreatmentsPage />} />
        <Route path="/hospital/policies" element={<HospitalPoliciesPage />} />
        <Route path="/hospital/notifications" element={<HospitalNotificationsPage />} />
        <Route path="/patient" element={<PatientPage />} />
        <Route path="/patient/treatments" element={<PatientTreatmentsPage />} />
        <Route path="/patient/billing" element={<PatientBillingPage />} />
        <Route path="/patient/policies" element={<PatientPoliciesPage />} />
        <Route path="/patient/insurers" element={<PatientInsurersPage />} />
        <Route path="/patient/visits" element={<PatientVisitsPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
