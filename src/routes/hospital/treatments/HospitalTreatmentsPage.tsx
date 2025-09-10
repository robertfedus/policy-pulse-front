import { useEffect, useMemo, useRef, useState } from "react"
import { RoleBasedLayout } from "@/components/layout/role-based-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  AlertTriangle,
  Stethoscope,
  Pill,
  Shield,
  Users,
  FileText,
  ExternalLink,
  Loader2,
  Search
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/contexts/auth-context"

// ---------- Config ----------
const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/+$/, "") ?? ""

// ---------- Backend types ----------
type FirestoreTimestamp = { _seconds: number; _nanoseconds: number }

type Illness = {
  name: string
  medications: string[]
}

type Patient = {
  id: string
  email: string
  name: string
  role: "patient" | "hospital"
  insuredAt?: string[]         // ["policies/<id>", ...]
  illnesses?: Illness[]        // correct spelling
  ilnesses?: Illness[]         // legacy spelling
  createdAt?: FirestoreTimestamp
}

type PatientsResponse = { data: Patient[] }

// Coverage entries commonly returned by policies API
type CoverageCovered = { type: "covered"; copay?: number }
type CoverageNotCovered = { type: "not_covered" }
type CoveragePercent = { type: "percent"; percent: number; copay?: number }
type CoverageEntry = CoverageCovered | CoverageNotCovered | CoveragePercent

type Policy = {
  id: string
  name: string
  // backend may send: Record<string, CoverageEntry | number | string>, or array of single-key objects
  coverage_map?: any
}

type PolicyResponse = { data: Policy } | { data: Policy[] }

// ---------- Helpers ----------
const extractPolicyId = (ref: string) => ref.split("/")[1] ?? ref
const getIllnesses = (p: Patient): Illness[] => p.illnesses ?? p.ilnesses ?? []

// Accept numbers/strings/objects for flexible coverage input
const parsePercentString = (s: string): number | null => {
  const m = s.trim().match(/^(\d+(?:\.\d+)?)\s*%?$/)
  return m ? Math.max(0, Math.min(100, Number(m[1]))) : null
}
const normalizeCoverageMapLoose = (raw: any): Record<string, any> => {
  if (!raw) return {}
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

// Convert raw value to a typed CoverageEntry we can reason about consistently
const interpretCoverage = (val: any): CoverageEntry | undefined => {
  if (val == null) return undefined

  // Already structured
  if (typeof val === "object" && "type" in val) {
    const t = String(val.type)
    if (t === "covered") return { type: "covered", copay: (val as any).copay }
    if (t === "not_covered") return { type: "not_covered" }
    if (t === "percent") {
      const percent = Number((val as any).percent) || 0
      const copay = (val as any).copay
      return { type: "percent", percent: Math.max(0, Math.min(100, percent)), copay }
    }
  }

  // Number form
  if (typeof val === "number") {
    const n = Math.max(0, Math.min(100, val))
    if (n <= 0) return { type: "not_covered" }
    if (n >= 100) return { type: "percent", percent: 100 }
    return { type: "percent", percent: n }
  }

  // String form
  if (typeof val === "string") {
    const s = val.trim().toLowerCase()
    if (s === "covered" || s === "full") return { type: "covered" }
    if (s === "not covered" || s === "not_covered" || s === "none") return { type: "not_covered" }
    const pct = parsePercentString(s)
    if (pct != null) {
      if (pct <= 0) return { type: "not_covered" }
      return { type: "percent", percent: pct }
    }
  }

  return undefined
}

// Full / None / Partial buckets per your rule
const isFull = (entry?: CoverageEntry): boolean => {
  if (!entry) return false
  if (entry.type === "covered") return true
  if (entry.type === "percent" && entry.percent >= 100) return true
  return false
}
const isNone = (entry?: CoverageEntry): boolean => {
  if (!entry) return true // treat missing as none for counting
  if (entry.type === "not_covered") return true
  if (entry.type === "percent" && entry.percent <= 0) return true
  return false
}

const labelCoverage = (
  entry?: CoverageEntry
): { text: string; variant: "default" | "secondary" | "destructive" } => {
  if (!entry) return { text: "Not covered", variant: "secondary" }
  if (entry.type === "covered") {
    const copay = entry.copay != null ? ` (copay $${entry.copay})` : ""
    return { text: `Covered${copay}`, variant: "default" }
  }
  if (entry.type === "percent") {
    const copay = entry.copay != null ? ` (copay $${entry.copay})` : ""
    return { text: `${entry.percent}%${copay}`, variant: "default" }
  }
  return { text: "Not covered", variant: "secondary" }
}

// --------- CASE-INSENSITIVE LOOKUP (key change lives here) ---------
const findKeyCaseInsensitive = (obj: Record<string, any>, wanted: string): string | null => {
  if (!wanted) return null
  if (Object.prototype.hasOwnProperty.call(obj, wanted)) return wanted
  const wantedLc = wanted.toLowerCase()
  for (const k of Object.keys(obj)) {
    if (k.toLowerCase() === wantedLc) return k
  }
  return null
}

// Get one medication entry from a policy, interpreting flexible shapes (case-insensitive)
const getPolicyMedCoverage = (pol: Policy | undefined, med: string): CoverageEntry | undefined => {
  if (!pol || !med) return undefined
  const map = normalizeCoverageMapLoose(pol.coverage_map)
  const matchedKey = findKeyCaseInsensitive(map, med)
  if (matchedKey == null) return undefined
  return interpretCoverage(map[matchedKey])
}

// Score used only for sorting patients within an illness (full > partial > none)
const rankCoverage = (entry?: CoverageEntry): number => {
  if (isFull(entry)) return 3
  if (isNone(entry)) return 0
  return 2 // partial
}

const bestPolicyForIllness = (
  patientPolicyIds: string[],
  meds: string[],
  policyById: Record<string, Policy>
): { policyId?: string; policyName?: string; score: number; details: Record<string, CoverageEntry | undefined> } => {
  let best = { score: -1, details: {} as Record<string, CoverageEntry | undefined> }
  for (const pid of patientPolicyIds) {
    const pol = policyById[pid]
    if (!pol) continue
    const details: Record<string, CoverageEntry | undefined> = {}
    let score = 0
    for (const m of meds) {
      const entry = getPolicyMedCoverage(pol, m)
      details[m] = entry
      score += rankCoverage(entry)
    }
    if (score > best.score) {
      best = { policyId: pol.id, policyName: pol.name, score, details }
    }
  }
  return best
}

const fmtHospitalCoverageSummary = (
  meds: string[],
  allPolicyIds: string[],
  policyById: Record<string, Policy>
): Record<string, { full: number; partial: number; none: number }> => {
  const out: Record<string, { full: number; partial: number; none: number }> = {}
  for (const m of meds) {
    let full = 0, partial = 0, none = 0
    for (const pid of allPolicyIds) {
      const pol = policyById[pid]
      const entry = getPolicyMedCoverage(pol, m)
      if (isFull(entry)) full++
      else if (isNone(entry)) none++
      else partial++
    }
    out[m] = { full, partial, none }
  }
  return out
}

// ---------- Page ----------
export default function TreatmentsPage() {
  const { user } = useAuth()
  const hospitalId = user?.role === "hospital" ? user.id : undefined

  const [patients, setPatients] = useState<Patient[]>([])
  const [policyById, setPolicyById] = useState<Record<string, Policy>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState("")

  const fetchedPolicyIdsRef = useRef<Set<string>>(new Set())

  // Fetch patients for this hospital
  useEffect(() => {
    if (!hospitalId) {
      setLoading(false)
      setPatients([])
      return
    }

    let cancelled = false
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 10000)

    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`${API_BASE}/api/v1/auth/hospital/${hospitalId}/patients`, {
          signal: ctrl.signal,
          headers: { Accept: "application/json" },
          credentials: "include",
          cache: "no-store",
        })
        if (!res.ok) {
          const body = await res.text().catch(() => "")
          throw new Error(`HTTP ${res.status}${body ? ` – ${body}` : ""}`)
        }
        const payload: PatientsResponse = await res.json()
        if (!cancelled) setPatients(Array.isArray(payload?.data) ? payload.data : [])
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load patients")
      } finally {
        clearTimeout(t)
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
      ctrl.abort()
      clearTimeout(t)
    }
  }, [hospitalId])

  // Collect unique policy ids from all patients, fetch each once (deduped)
  useEffect(() => {
    const ids = new Set<string>()
    for (const p of patients) (p.insuredAt ?? []).forEach((ref) => ids.add(extractPolicyId(ref)))

    const toFetch = Array.from(ids).filter(
      (id) => !policyById[id] && !fetchedPolicyIdsRef.current.has(id)
    )
    if (toFetch.length === 0) return

    toFetch.forEach((id) => fetchedPolicyIdsRef.current.add(id))

    let cancelled = false
    const ctrl = new AbortController()

    ;(async () => {
      try {
        const results = await Promise.allSettled(
          toFetch.map(async (id) => {
            const res = await fetch(`${API_BASE}/api/v1/policies/${id}`, {
              signal: ctrl.signal,
              headers: { Accept: "application/json" },
              credentials: "include",
              cache: "no-store",
            })
            if (res.status === 304) return null
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const payload: PolicyResponse = await res.json()
            const pol = Array.isArray((payload as any).data)
              ? (payload as any).data[0]
              : (payload as any).data
            if (!pol || !pol.id) return null
            return pol as Policy
          })
        )

        if (cancelled) return
        setPolicyById((prev) => {
          const next = { ...prev }
          for (const r of results) {
            if (r.status === "fulfilled" && r.value && r.value.id) {
              next[r.value.id] = r.value
            }
          }
          return next
        })
      } catch {
        // no-op (dedupe set prevents tight loops)
      }
    })()

    return () => {
      cancelled = true
      ctrl.abort()
    }
  }, [patients, policyById])

  // Build Illness -> { medications, patients[], hospitalCoverageSummary }
  type IllnessCard = {
    illness: string
    medications: string[]
    patients: Array<{
      id: string
      name: string
      email: string
      bestPolicyId?: string
      bestPolicyName?: string
      bestScore: number
      perMedication: Record<string, CoverageEntry | undefined>
    }>
    coverageSummary: Record<string, { full: number; partial: number; none: number }>
  }

  const illnessCards: IllnessCard[] = useMemo(() => {
    const term = q.trim().toLowerCase()
    const filteredPatients = term
      ? patients.filter((p) => {
          const pool = [
            p.name?.toLowerCase() ?? "",
            p.email?.toLowerCase() ?? "",
            ...getIllnesses(p).flatMap((ill) => [
              ill.name.toLowerCase(),
              ...ill.medications.map((m) => m.toLowerCase()),
            ]),
          ]
          return pool.some((s) => s.includes(term))
        })
      : patients

    const map = new Map<
      string,
      { meds: Set<string>; members: Patient[]; allPolicyIds: Set<string> }
    >()

    for (const p of filteredPatients) {
      const polIds = new Set((p.insuredAt ?? []).map(extractPolicyId))
      for (const ill of getIllnesses(p)) {
        const entry =
          map.get(ill.name) ??
          { meds: new Set<string>(), members: [], allPolicyIds: new Set<string>() }
        ill.medications.forEach((m) => entry.meds.add(m))
        entry.members.push(p)
        polIds.forEach((id) => entry.allPolicyIds.add(id))
        map.set(ill.name, entry)
      }
    }

    const res: IllnessCard[] = []
    for (const [illness, { meds, members, allPolicyIds }] of map) {
      const coverageSummary = fmtHospitalCoverageSummary(
        Array.from(meds),
        Array.from(allPolicyIds),
        policyById
      )

      const rows = members.map((p) => {
        const patientPolicyIds = (p.insuredAt ?? []).map(extractPolicyId)
        const { policyId, policyName, score, details } = bestPolicyForIllness(
          patientPolicyIds,
          Array.from(meds),
          policyById
        )
        return {
          id: p.id,
          name: p.name,
          email: p.email,
          bestPolicyId: policyId,
          bestPolicyName: policyName,
          bestScore: score,
          perMedication: details,
        }
      })

      rows.sort((a, b) => (b.bestScore - a.bestScore) || a.name.localeCompare(b.name))

      res.push({
        illness,
        medications: Array.from(meds),
        patients: rows,
        coverageSummary,
      })
    }

    res.sort((a, b) => b.patients.length - a.patients.length)
    return res
  }, [patients, policyById, q])

  const openPolicyPdf = (policyId: string) => {
    const url = `${API_BASE}/api/v1/policies/${policyId}/pdf`
    window.open(url, "_blank", "noopener,noreferrer")
  }

  return (
    <RoleBasedLayout>
      <div className="space-y-6">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Stethoscope className="h-7 w-7 text-primary" />
              Illnesses & Coverage
            </h1>
            <p className="text-muted-foreground mt-2">
              Aggregate view of illnesses, medications, coverage and affected patients.
            </p>
          </div>

          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by patient, illness, or medication…"
              className="pl-10"
            />
          </div>
        </div>

        {loading && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading data…
              </CardTitle>
              <CardDescription>Fetching patients and policies</CardDescription>
            </CardHeader>
          </Card>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="break-words">{error}</AlertDescription>
          </Alert>
        )}

        {!loading && !error && illnessCards.length === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>No illnesses found</CardTitle>
              <CardDescription>
                We couldn’t derive any illnesses from the current patients set.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {/* Illness cards */}
        <div className="space-y-4">
          {illnessCards.map((card) => (
            <Card key={card.illness} className="overflow-hidden">
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="flex items-center gap-2">
                      <Pill className="h-5 w-5 text-primary" />
                      {card.illness}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {card.patients.length} patient{card.patients.length === 1 ? "" : "s"} affected
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-5">
                {/* Medications with coverage summary */}
                <div>
                  <h4 className="font-medium text-foreground mb-3">Medications & Coverage</h4>
                  <div className="space-y-2">
                    {card.medications.map((m) => {
                      const agg = card.coverageSummary[m] ?? { full: 0, partial: 0, none: 0 }
                      return (
                        <div key={m} className="flex items-center justify-between p-2 rounded-md bg-muted/60">
                          <div className="text-sm font-medium">{m}</div>
                          <div className="flex items-center gap-2">
                            <Badge variant="default">Full: {agg.full}</Badge>
                            <Badge variant="secondary">Partial: {agg.partial}</Badge>
                            <Badge variant="outline">None: {agg.none}</Badge>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Patients list */}
                <div>
                  <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
                    <Users className="h-4 w-4" /> Patients
                  </h4>

                  <div className="space-y-2">
                    {card.patients.map((p) => (
                      <div key={p.id} className="p-3 rounded-lg border bg-card">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-medium truncate">{p.name}</div>
                            <div className="text-xs text-muted-foreground truncate">{p.email}</div>
                          </div>

                          {/* Best policy chip (if any) */}
                          {p.bestPolicyId ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openPolicyPdf(p.bestPolicyId!)}
                              className="inline-flex items-center"
                              title="Open policy PDF"
                            >
                              <Shield className="h-4 w-4 mr-2" />
                              {p.bestPolicyName ?? p.bestPolicyId}
                              <ExternalLink className="h-3.5 w-3.5 ml-2" />
                            </Button>
                          ) : (
                            <Badge variant="secondary">No policy match</Badge>
                          )}
                        </div>

                        {/* Per-medication coverage details */}
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          {card.medications.map((m) => {
                            const entry = p.perMedication[m]
                            const { text, variant } = labelCoverage(entry)
                            return (
                              <div
                                key={m}
                                className="flex items-center justify-between rounded-md border px-2 py-1 text-sm"
                              >
                                <span className="truncate">{m}</span>
                                <Badge variant={variant}>{text}</Badge>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick actions */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const ids = new Set<string>()
                      card.patients.forEach((p) => {
                        if (p.bestPolicyId) ids.add(p.bestPolicyId)
                      })
                      ids.forEach((id) => openPolicyPdf(id))
                    }}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Open Best Policies (PDF)
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </RoleBasedLayout>
  )
}
