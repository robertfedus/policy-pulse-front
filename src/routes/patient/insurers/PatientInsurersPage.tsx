import React, { useEffect, useMemo, useState } from "react"
import { RoleBasedLayout } from "@/components/layout/role-based-layout"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Building2, FileText, ExternalLink, AlertTriangle, Loader2, Shield, Calendar } from "lucide-react"

const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/+$/, "") ?? ""

// -------- Types from your backend shape --------
type FirestoreTimestamp = { _seconds: number; _nanoseconds: number }

type Patient = {
  id: string
  email: string
  name: string
  role: "patient" | "hospital"
  insuredAt?: string[]            // ["policies/<id>", ...]
  illnesses?: any[]
  ilnesses?: any[]                // legacy spelling
  createdAt?: FirestoreTimestamp
  updatedAt?: FirestoreTimestamp
}
type PatientsResponse = { data: Patient[] }

type CoverageEntry =
  | { type: "covered" }
  | { type: "percent"; percent: number; copay?: number }
  | { type: "not_covered" }

type BackendPolicy = {
  id: string
  name: string
  effectiveDate: string | null
  version: number | string
  coverage_map?: Record<string, CoverageEntry>
  insuranceCompanyRef?: string   // "insurance_companies/<id>"
  beFileName?: string
}

type PolicyResponse = { data: BackendPolicy } | { data: BackendPolicy[] }

// -------- Helpers --------
const extractPolicyId = (ref: string) => ref.split("/")[1] ?? ref
const companyIdFromRef = (ref?: string) => (ref ? (ref.split("/")[1] ?? ref) : "")
const companyLabelFromRef = (ref?: string) => {
  const id = companyIdFromRef(ref)
  return id ? `Insurer ${id.slice(0, 6)}…` : "Unknown Insurer"
}

async function fetchPatientMe(user: { id?: string; email?: string } | null) {
  const res = await fetch(`${API_BASE}/api/v1/auth/patients`, {
    headers: { Accept: "application/json" },
    credentials: "include",
    cache: "no-store",
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const payload: PatientsResponse = await res.json()
  const list = Array.isArray(payload?.data) ? payload.data : []

  // Prefer ID match, fallback to email
  const byId = user?.id ? list.find((p) => p.id === user.id) : undefined
  const byEmail = !byId && user?.email ? list.find((p) => p.email === user.email) : undefined
  return byId ?? byEmail ?? null
}

async function fetchPolicy(policyId: string): Promise<BackendPolicy | null> {
  // Try singular endpoint first
  try {
    const res = await fetch(`${API_BASE}/api/v1/policies/${policyId}`, {
      headers: { Accept: "application/json" },
      credentials: "include",
    })
    if (res.ok) {
      const payload: PolicyResponse = await res.json()
      const data = Array.isArray((payload as any).data) ? (payload as any).data[0] : (payload as any).data
      return (data as BackendPolicy) ?? null
    }
  } catch {}
  return null
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—"
  try { return new Date(iso).toLocaleDateString() } catch { return iso ?? "—" }
}

// -------- Page --------
export default function PatientInsurersPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [myPolicies, setMyPolicies] = useState<BackendPolicy[]>([])

  useEffect(() => {
    let cancelled = false
    const ctrl = new AbortController()

    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        // 1) Load current patient
        const me = await fetchPatientMe(user ?? null)
        if (!me) {
          if (!cancelled) {
            setMyPolicies([])
            setError("No profile found for your account.")
          }
          return
        }

        const policyRefs = Array.isArray(me.insuredAt) ? me.insuredAt : []
        const ids = policyRefs.map(extractPolicyId).filter(Boolean)
        if (ids.length === 0) {
          if (!cancelled) setMyPolicies([])
          return
        }

        // 2) Resolve each policy
        const results = await Promise.allSettled(ids.map(fetchPolicy))
        const policies: BackendPolicy[] = results
          .map((r) => (r.status === "fulfilled" ? r.value : null))
          .filter(Boolean) as BackendPolicy[]

        if (!cancelled) setMyPolicies(policies)
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load insurers")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => { cancelled = true; ctrl.abort() }
  }, [user?.id, user?.email])

  // Group policies by insurance company
  const grouped = useMemo(() => {
    const m = new Map<string, { companyRef?: string; policies: BackendPolicy[] }>()
    for (const p of myPolicies) {
      const key = companyIdFromRef(p.insuranceCompanyRef) || "unknown"
      const bucket = m.get(key) ?? { companyRef: p.insuranceCompanyRef, policies: [] }
      bucket.policies.push(p)
      m.set(key, bucket)
    }
    return Array.from(m.entries()).map(([companyId, v]) => ({
      companyId,
      companyRef: v.companyRef,
      label: companyLabelFromRef(v.companyRef),
      policies: v.policies,
    }))
  }, [myPolicies])

  const openPolicyPdf = (policyId: string) => {
    window.open(`${API_BASE}/api/v1/policies/${policyId}/pdf`, "_blank", "noopener,noreferrer")
  }

  return (
    <RoleBasedLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Insurance Companies</h1>
          <p className="text-muted-foreground mt-2">
            Insurers linked to your account, based on your current policies.
          </p>
        </div>

        {loading && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading your insurers…
              </CardTitle>
              <CardDescription>Fetching your record and insured policies.</CardDescription>
            </CardHeader>
          </Card>
        )}

        {error && (
          <Card className="border-destructive/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Couldn’t load insurers
              </CardTitle>
              <CardDescription className="break-words">{error}</CardDescription>
            </CardHeader>
          </Card>
        )}

        {!loading && !error && grouped.length === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>No insurance companies found</CardTitle>
              <CardDescription>
                We didn’t find any linked policies on your account.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {/* Companies list */}
        {grouped.map((g) => (
          <Card key={g.companyId}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    <span className="truncate">{g.label}</span>
                  </CardTitle>
                  <CardDescription>
                    {g.policies.length} linked policy{g.policies.length === 1 ? "" : "ies"}
                  </CardDescription>
                </div>
                <Badge variant={g.policies.length > 0 ? "default" : "secondary"}>
                  {g.policies.length > 0 ? "Active" : "Inactive"}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium text-foreground mb-2 flex items-center">
                  <Shield className="h-4 w-4 mr-2" />
                  Your Policies with this Insurer
                </h4>

                {g.policies.map((p) => (
                  <div key={p.id} className="p-3 rounded-md border bg-card mb-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{p.name}</div>
                        <div className="text-xs text-muted-foreground">
                          Effective: {fmtDate(p.effectiveDate)} • Version: v{Number(p.version) || 0}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {p.beFileName && (
                          <Badge variant="outline" className="inline-flex items-center">
                            <FileText className="h-3.5 w-3.5 mr-1" />
                            {p.beFileName}
                          </Badge>
                        )}
                        <Button variant="outline" size="sm" onClick={() => openPolicyPdf(p.id)} title="Open policy PDF">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Open PDF
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </RoleBasedLayout>
  )
}
