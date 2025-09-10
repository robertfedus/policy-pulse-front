import React, { useEffect, useMemo, useState } from "react"
import { RoleBasedLayout } from "@/components/layout/role-based-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Users,
  FileText,
  Shield,
  Activity,
  TrendingUp,
  AlertTriangle,
  Plus,
} from "lucide-react"

const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/+$/, "") ?? ""

// ---------- Types ----------
type FirestoreTimestamp = { _seconds: number; _nanoseconds: number }

type Illness = { name: string; medications: string[] }

type Patient = {
  id: string
  email: string
  name: string
  role: "patient" | "hospital"
  insuredAt?: string[] // ["policies/<id>", ...]
  illnesses?: Illness[]
  ilnesses?: Illness[] // legacy spelling
  createdAt?: FirestoreTimestamp
}

type PatientsResponse = { data: Patient[] }

type CoverageEntry =
  | { type: "covered" }
  | { type: "percent"; percent: number; copay?: number }
  | { type: "not_covered" }

type Policy = {
  id: string
  name: string
  beFileName?: string
  effectiveDate: string | null
  version: number | string
  coverage_map?: any
  createdAt?: FirestoreTimestamp
}

type PoliciesResponse = { data: Policy[] } | { data: Policy }
type VersionsPair = { v1: number | string; id1: string; v2: number | string; id2: string }
type ChangesVersionsResponse = {
  data: Record<string /* "<PolicyName>::insurance_companies/<companyId>" */, VersionsPair[]>
}

// ---------- Helpers ----------
const api = (path: string) => {
  // Accepts with or without leading slash; always returns ".../api/v1/<path>"
  const clean = path.replace(/^\/+/, "")
  return `${API_BASE}/api/v1/${clean}`
}

const getIllnesses = (p: Patient): Illness[] => p.illnesses ?? p.ilnesses ?? []

const tsToDate = (ts?: FirestoreTimestamp) =>
  ts ? new Date(ts._seconds * 1000 + Math.floor(ts._nanoseconds / 1e6)) : undefined

const fmtDate = (iso: string | null | undefined) => {
  if (!iso) return "—"
  try { return new Date(iso).toLocaleDateString() } catch { return iso ?? "—" }
}

const normalizeCoverageMapLoose = (raw: any): Record<string, any> => {
  if (!raw) return {}
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw)
      // Some backends send {"0": {...}, "1": {...}} for arrays — flatten that
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as Record<string, any>
    } catch {
      return {}
    }
  }
  if (Array.isArray(raw)) {
    const out: Record<string, any> = {}
    for (const item of raw) {
      if (item && typeof item === "object") {
        const k = Object.keys(item)[0]
        if (k) out[k] = item[k]
      }
    }
    return out
  }
  if (typeof raw === "object") return raw as Record<string, any>
  return {}
}

const hasEmptyCoverage = (p: Policy) => {
  const map = normalizeCoverageMapLoose(p.coverage_map)
  return Object.keys(map).length === 0
}

const daysUntil = (iso?: string | null) => {
  if (!iso) return Infinity
  const d = new Date(iso)
  const now = new Date()
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

// ---------- Component ----------
export default function HospitalDashboard() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [policies, setPolicies] = useState<Policy[]>([])
  const [changes, setChanges] = useState<
    Array<{ key: string; policyName: string; v1: number; v2: number }>
  >([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const ctrl = new AbortController()

    ;(async () => {
      setLoading(true); setError(null)
      try {
        // Patients + Policies in parallel
        const [patsRes, polsRes] = await Promise.all([
          fetch(api("/auth/patients"), {
            signal: ctrl.signal, headers: { Accept: "application/json" }, credentials: "include",
          }),
          fetch(api("/policies"), {
            signal: ctrl.signal, headers: { Accept: "application/json" }, credentials: "include",
          }),
        ])
        if (!patsRes.ok) throw new Error(`Patients HTTP ${patsRes.status}`)
        if (!polsRes.ok) throw new Error(`Policies HTTP ${polsRes.status}`)

        const patsPayload: PatientsResponse = await patsRes.json()
        const polsPayload: PoliciesResponse = await polsRes.json()

        // Recent policy version changes (non-fatal if it fails)
        let changesOut: Array<{ key: string; policyName: string; v1: number; v2: number }> = []
        try {
          const chRes = await fetch(api("/policies/changes/versions"), {
            signal: ctrl.signal, headers: { Accept: "application/json" }, credentials: "include",
          })
          if (chRes.ok) {
            const chPayload: ChangesVersionsResponse = await chRes.json()
            for (const k of Object.keys(chPayload?.data ?? {})) {
              const [name] = k.split("::")
              const arr = chPayload.data[k] ?? []
              for (const pair of arr) {
                changesOut.push({
                  key: `${k}::${pair.id1}->${pair.id2}`,
                  policyName: name,
                  v1: Number(pair.v1) || 0,
                  v2: Number(pair.v2) || 0,
                })
              }
            }
            changesOut.sort((a, b) => (b.v2 - a.v2) || a.policyName.localeCompare(b.policyName))
          }
        } catch {
          // ignore; keep empty changes
        }

        if (!cancelled) {
          setPatients(Array.isArray(patsPayload?.data) ? patsPayload.data : [])
          setPolicies(Array.isArray((polsPayload as any)?.data) ? (polsPayload as any).data : [])
          setChanges(changesOut)
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load dashboard data")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => { cancelled = true; ctrl.abort() }
  }, [])

  // ---------- Derived metrics ----------
  const totalPatients = patients.length
  const totalPolicies = policies.length

  const uniqueDiseaseCount = useMemo(() => {
    const set = new Set<string>()
    for (const p of patients) {
      for (const ill of getIllnesses(p)) {
        if (ill?.name) set.add(ill.name.trim().toLowerCase())
      }
    }
    return set.size
  }, [patients])

  const recentPolicyChanges = changes.slice(0, 5)
  const recentPatients = useMemo(() => {
    const withDates = patients
      .map((p) => ({ p, d: tsToDate(p.createdAt)?.getTime() ?? 0 }))
      .sort((a, b) => b.d - a.d)
      .slice(0, 5)
    return withDates.map((x) => x.p)
  }, [patients])

  const patientsNoInsurance = patients.filter((p) => !p.insuredAt || p.insuredAt.length === 0)
  const policiesEmptyCoverage = policies.filter((p) => hasEmptyCoverage(p))
  const policiesEffectiveSoon = policies
    .map((p) => ({ p, days: daysUntil(p.effectiveDate) }))
    .filter((x) => x.days >= 0 && x.days <= 30)
    .sort((a, b) => a.days - b.days)
    .slice(0, 5)

  return (
    <RoleBasedLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Hospital Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Live overview from your backend: patients, diseases, policies, and action items.
          </p>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? "…" : totalPatients}
              </div>
              <p className="text-xs text-muted-foreground">Getting well soon</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unique Diseases</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? "…" : uniqueDiseaseCount}
              </div>
              <p className="text-xs text-muted-foreground">Derived from patients’ illnesses</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Policies</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? "…" : totalPolicies}
              </div>
              <p className="text-xs text-muted-foreground">Usable in our hospital</p>
            </CardContent>
          </Card>

          {/* Hardcoded Online status */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Status</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">Online</div>
              <p className="text-xs text-muted-foreground">All systems operational</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity + Action Center */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="mr-2 h-5 w-5 text-primary" />
                Recent Activity
              </CardTitle>
              <CardDescription>Latest policy changes and new patients</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Policy changes */}
              <div>
                <div className="text-sm font-semibold mb-2">Policy Version Changes</div>
                {loading && <div className="text-sm text-muted-foreground">Loading…</div>}
                {!loading && recentPolicyChanges.length === 0 && (
                  <div className="text-sm text-muted-foreground">No recent changes</div>
                )}
                {!loading && recentPolicyChanges.map((c) => (
                  <div key={c.key} className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {c.policyName}: v{c.v1} → v{c.v2}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* New patients */}
              <div>
                <div className="text-sm font-semibold mt-4 mb-2">New Patients</div>
                {loading && <div className="text-sm text-muted-foreground">Loading…</div>}
                {!loading && recentPatients.length === 0 && (
                  <div className="text-sm text-muted-foreground">No new patients</div>
                )}
                {!loading && recentPatients.map((p) => (
                  <div key={p.id} className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Action Center */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="mr-2 h-5 w-5 text-yellow-600" />
                Action Center
              </CardTitle>
              <CardDescription>Items that may require attention</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Patients without insurance */}
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm font-medium text-yellow-800">
                  Patients Without Insurance
                </p>
                <p className="text-xs text-yellow-700 mt-1">
                  {loading ? "…" : `${patientsNoInsurance.length} patient(s) without any policy`}
                </p>
              </div>

              {/* Policies with empty coverage */}
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm font-medium text-red-800">
                  Policies Missing Coverage Details
                </p>
                <p className="text-xs text-red-700 mt-1">
                  {loading ? "…" : `${policiesEmptyCoverage.length} policy(ies) with empty coverage_map`}
                </p>
              </div>

              {/* Policies effective soon */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm font-medium text-blue-800">
                  Policies Effective Soon (≤ 30 days)
                </p>
                {loading && <p className="text-xs text-blue-700 mt-1">…</p>}
                {!loading && policiesEffectiveSoon.length === 0 && (
                  <p className="text-xs text-blue-700 mt-1">None</p>
                )}
                {!loading && policiesEffectiveSoon.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {policiesEffectiveSoon.map(({ p, days }) => (
                      <div key={p.id} className="text-xs text-blue-800">
                        {p.name} — {fmtDate(p.effectiveDate)} ({days} day{days === 1 ? "" : "s"})
                      </div>
                    ))}
                  </div>
                )}
              </div>

              
            </CardContent>
          </Card>
        </div>

        {error && (
          <div className="text-sm text-red-600">{String(error)}</div>
        )}
      </div>
    </RoleBasedLayout>
  )
}
