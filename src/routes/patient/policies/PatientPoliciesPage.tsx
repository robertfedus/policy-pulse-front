import { useEffect, useMemo, useRef, useState } from "react"
import { RoleBasedLayout } from "@/components/layout/role-based-layout"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Shield,
  AlertCircle,
  FileText,
  ExternalLink,
  History,
} from "lucide-react"

const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/+$/, "") ?? ""

// ----------------- Types -----------------
type FirestoreTimestamp = { _seconds: number; _nanoseconds: number }

type Patient = {
  id: string
  email: string
  name: string
  role: "patient" | "hospital"
  insuredAt?: string[] // ["policies/<id>", ...]
  createdAt?: FirestoreTimestamp
  updatedAt?: FirestoreTimestamp
}

type PatientsResponse = { data: Patient[] }

type CoverageEntry =
  | { type: "covered"; copay?: number }
  | { type: "percent"; percent: number; copay?: number }
  | { type: "not_covered" }

type BackendPolicy = {
  id: string
  name: string
  summary?: string | { ok: boolean; reason?: string }
  beFileName?: string
  effectiveDate: string | null
  version: number | string
  coverage_map: any
  createdAt?: FirestoreTimestamp
  updatedAt?: FirestoreTimestamp
  insuranceCompanyRef?: string
}
type PolicyResponse = { data: BackendPolicy } | { data: BackendPolicy[] }
type PdfUrlResponse = { url?: string }

// ----------------- Helpers -----------------
const api = (path: string) => `${API_BASE}/api/v1${path}`

const extractPolicyId = (ref: string) => ref.split("/")[1] ?? ref

const companyNameFromRef = (ref?: string) => {
  if (!ref) return "Unknown Insurer"
  const id = ref.split("/")[1] ?? ref
  return `Insurer ${id.slice(0, 6)}…`
}

const fmtDate = (iso: string | null | undefined) => {
  if (!iso) return "—"
  try { return new Date(iso).toLocaleDateString() } catch { return iso ?? "—" }
}

const toSummaryText = (summary: BackendPolicy["summary"]): string | null => {
  if (typeof summary === "string") return summary
  if (summary && typeof summary === "object") {
    if ("reason" in summary && (summary as any).reason) return String((summary as any).reason)
    try { return JSON.stringify(summary) } catch { return null }
  }
  return null
}

// Convert mixed coverage_map -> clean object of CoverageEntry
function normalizeCoverageMap(raw: any): Record<string, CoverageEntry> {
  const out: Record<string, CoverageEntry> = {}
  if (!raw) return out

  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (!item || typeof item !== "object") continue
      const key = Object.keys(item)[0]
      const val = key ? item[key] : undefined
      if (!key) continue
      if (typeof val === "number") {
        if (val <= 0) out[key] = { type: "not_covered" }
        else out[key] = { type: "percent", percent: Math.max(0, Math.min(100, val)) }
      } else if (val && typeof val === "object" && "type" in (val as any)) {
        out[key] = val as CoverageEntry
      }
    }
    return out
  }

  if (raw && typeof raw === "object") {
    for (const [key, val] of Object.entries(raw)) {
      if (typeof val === "number") {
        if (val <= 0) out[key] = { type: "not_covered" }
        else out[key] = { type: "percent", percent: Math.max(0, Math.min(100, val)) }
      } else if (val && typeof val === "object") {
        const v = val as any
        if (typeof v.type === "string") {
          if (v.type === "covered") out[key] = { type: "covered", copay: v.copay }
          else if (v.type === "not_covered") out[key] = { type: "not_covered" }
          else if (v.type === "percent") out[key] = { type: "percent", percent: Number(v.percent) || 0, copay: v.copay }
        }
      }
    }
    return out
  }
  return out
}

const normalizePolicy = <T extends BackendPolicy>(p: T) => ({
  ...p,
  version: Number((p as any).version) || 0,
  coverage_map: normalizeCoverageMap((p as any).coverage_map),
})

const humanCoverage = (k: string, v: CoverageEntry) => {
  switch (v.type) {
    case "covered": {
      const copay = v.copay != null ? ` (copay $${v.copay})` : ""
      return `${k}: covered${copay}`
    }
    case "not_covered":
      return `${k}: not covered`
    case "percent": {
      const copay = v.copay != null ? ` (copay $${v.copay})` : ""
      return `${k}: ${v.percent}%${copay}`
    }
  }
}

// Prefer /pdf-url, fallback /pdf
async function resolvePdfUrl(policyId: string): Promise<string> {
  try {
    const res = await fetch(api(`/policies/${policyId}/pdf-url`), {
      headers: { Accept: "application/json" },
      credentials: "include",
    })
    if (res.ok) {
      const payload: PdfUrlResponse = await res.json()
      if (payload?.url) return payload.url
    }
  } catch {}
  return api(`/policies/${policyId}/pdf`)
}

// ----------------- Page -----------------
export default function PatientPoliciesPage() {
  const { user } = useAuth()

  const [me, setMe] = useState<Patient | null>(null)
  const [policies, setPolicies] = useState<ReturnType<typeof normalizePolicy>[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 1) Load current user from /auth/patients
  useEffect(() => {
    let cancelled = false
    const ctrl = new AbortController()

    ;(async () => {
      setLoading(true); setError(null)
      try {
        const res = await fetch(api("/auth/patients"), {
          signal: ctrl.signal,
          headers: { Accept: "application/json" },
          credentials: "include",
          cache: "no-store",
        })
        if (!res.ok) throw new Error(`Patients HTTP ${res.status}`)
        const payload: PatientsResponse = await res.json()
        const list = Array.isArray(payload?.data) ? payload.data : []

        const mine =
          (user?.id && list.find((p) => p.id === user.id)) ||
          (user?.email && list.find((p) => p.email === user.email)) ||
          null

        if (!cancelled) setMe(mine)
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load your profile")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => { cancelled = true; ctrl.abort() }
  }, [user?.id, user?.email])

  // 2) When we know the patient, fetch their policies by ID
  useEffect(() => {
    if (!me) { setPolicies([]); return }
    const refs = me.insuredAt ?? []
    const ids = Array.from(new Set(refs.map(extractPolicyId)))
    if (ids.length === 0) { setPolicies([]); return }

    let cancelled = false
    const ctrl = new AbortController()

    ;(async () => {
      try {
        const results = await Promise.allSettled(
          ids.map(async (id) => {
            const r = await fetch(api(`/policies/${id}`), {
              signal: ctrl.signal,
              headers: { Accept: "application/json" },
              credentials: "include",
            })
            if (!r.ok) throw new Error(`Policy ${id} HTTP ${r.status}`)
            const payload: PolicyResponse = await r.json()
            const pol = Array.isArray((payload as any).data) ? (payload as any).data[0] : (payload as any).data
            return pol ? normalizePolicy(pol as BackendPolicy) : null
          })
        )
        if (cancelled) return
        const ok = results
          .filter((x): x is PromiseFulfilledResult<ReturnType<typeof normalizePolicy> | null> => x.status === "fulfilled")
          .map((x) => x.value)
          .filter(Boolean) as ReturnType<typeof normalizePolicy>[]
        setPolicies(ok)
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load your policies")
      }
    })()

    return () => { cancelled = true; ctrl.abort() }
  }, [me])

  const openPolicyPdf = async (policyId: string) => {
    const url = await resolvePdfUrl(policyId)
    window.open(url, "_blank", "noopener,noreferrer")
  }

  // Sort by insurer + name, newest first within a name
  const sorted = useMemo(() => {
    const arr = [...policies]
    arr.sort((a, b) => {
      const an = (a.insuranceCompanyRef ?? "").localeCompare(b.insuranceCompanyRef ?? "")
      if (an !== 0) return an
      const nn = (a.name ?? "").localeCompare(b.name ?? "")
      if (nn !== 0) return nn
      return (Number(b.version) || 0) - (Number(a.version) || 0)
    })
    return arr
  }, [policies])

  return (
    <RoleBasedLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Insurance Policies</h1>
          <p className="text-muted-foreground mt-2">
            These are the policies linked to your account. You can open the PDF for details.
          </p>
        </div>

        <Tabs defaultValue="list" className="space-y-4">
          <TabsList>
            <TabsTrigger value="list">Policies</TabsTrigger>
          </TabsList>

          {/* ---------- Policies for the current patient ---------- */}
          <TabsContent value="list" className="space-y-4">
            {loading && (
              <Card>
                <CardHeader>
                  <CardTitle>Loading your policies…</CardTitle>
                  <CardDescription>Fetching your profile from /auth/patients and policy details.</CardDescription>
                </CardHeader>
              </Card>
            )}

            {error && !loading && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <AlertCircle className="h-5 w-5 mr-2 text-destructive" />
                    Couldn’t load
                  </CardTitle>
                  <CardDescription className="text-destructive break-words">{error}</CardDescription>
                </CardHeader>
              </Card>
            )}

            {!loading && !error && me && (me.insuredAt?.length ?? 0) === 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>No policies linked</CardTitle>
                  <CardDescription>
                    Your profile doesn’t list any policy references.
                  </CardDescription>
                </CardHeader>
              </Card>
            )}

            {!loading && !error && me && sorted.length === 0 && (me.insuredAt?.length ?? 0) > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Policies unavailable</CardTitle>
                  <CardDescription>
                    We found policy references on your profile, but fetching details failed or returned empty.
                  </CardDescription>
                </CardHeader>
              </Card>
            )}

            {sorted.map((policy) => {
              const insurer = companyNameFromRef(policy.insuranceCompanyRef)
              const coverageEntries = Object.entries(policy.coverage_map || {})
              const sumText = toSummaryText(policy.summary)

              return (
                <Card key={policy.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <CardTitle className="flex items-center gap-2">
                          <Shield className="h-5 w-5 text-primary" />
                          <button
                            type="button"
                            onClick={() => openPolicyPdf(policy.id)}
                            className="text-primary hover:underline p-0 h-auto font-semibold truncate"
                            title="Open policy PDF"
                          >
                            {policy.name}
                          </button>
                          <span className="ml-2 text-sm text-muted-foreground">
                            v{Number(policy.version) || 0}
                          </span>
                        </CardTitle>
                        <CardDescription className="space-x-2">
                          <span>{insurer}</span>
                          <span>• Effective: {fmtDate(policy.effectiveDate)}</span>
                          {policy.beFileName && (
                            <>
                              <span>•</span>
                              <span className="inline-flex items-center">
                                <FileText className="h-3.5 w-3.5 mr-1" />
                                {policy.beFileName}
                              </span>
                            </>
                          )}
                        </CardDescription>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="secondary">
                          {coverageEntries.length} coverage item{coverageEntries.length === 1 ? "" : "s"}
                        </Badge>
                        <Button variant="outline" size="sm" onClick={() => openPolicyPdf(policy.id)}>
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Open PDF
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent>
                    {sumText && <p className="text-sm text-muted-foreground mb-3">{sumText}</p>}

                    {coverageEntries.length > 0 ? (
                      <div className="space-y-2">
                        <h4 className="font-medium text-foreground flex items-center">
                          <History className="h-4 w-4 mr-2" />
                          Coverage
                        </h4>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {coverageEntries.map(([drug, rule]) => (
                            <div key={drug} className="text-sm p-2 rounded-md bg-muted/60 border border-border/40">
                              {humanCoverage(drug, rule as CoverageEntry)}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">No coverage items listed on this policy.</div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </TabsContent>
        </Tabs>
      </div>
    </RoleBasedLayout>
  )
}
