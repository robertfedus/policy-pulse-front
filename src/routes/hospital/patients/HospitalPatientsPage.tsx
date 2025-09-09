import { useEffect, useMemo, useState } from "react"
import { RoleBasedLayout } from "@/components/layout/role-based-layout"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  AlertCircle,
  Shield,
  Users,
  Search,
  Calendar,
  ChevronDown,
  ChevronUp,
  Info,
  Mail,
  Hash,
} from "lucide-react"

// --- shared with login style ---
const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/+$/, "") ?? ""

// ----------------- Types mapped to your backend response -----------------
type FirestoreTimestamp = { _seconds: number; _nanoseconds: number }

export type Illness = {
  name: string
  medications: string[]
}

export type PatientDto = {
  id: string
  email: string
  name: string
  role: "patient"
  password?: string // demo-only from your API (we do NOT render this)
  insuredAt?: string[] // ['policies/xyz', ...]
  ilnesses?: Illness[]  // note: backend key is "ilnesses" (spelling)
  createdAt?: FirestoreTimestamp
}

type PatientsResponse = { data: PatientDto[] }

// minimal policy type (for name lookup)
type BackendPolicy = {
  id: string
  name: string
}

// ----------------- Helpers -----------------
const fmtDateFromFirestore = (ts?: FirestoreTimestamp) => {
  if (!ts || typeof ts._seconds !== "number") return "-"
  try {
    return new Date(ts._seconds * 1000).toLocaleDateString()
  } catch {
    return "-"
  }
}

const extractPolicyId = (ref: string) => ref.split("/")[1] ?? ref

const normalize = (v: unknown) => (typeof v === "string" ? v : "")

// ----------------- Page -----------------
export default function HospitalPatientsPage() {
  const { user } = useAuth()
  const [patients, setPatients] = useState<PatientDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState("")
  const [open, setOpen] = useState<Set<string>>(new Set()) // ids of expanded rows

  // cache policy names: id -> name
  const [policyNameById, setPolicyNameById] = useState<Record<string, string>>({})
  const [policiesLoaded, setPoliciesLoaded] = useState(false)

  const hospitalId = user?.role === "hospital" ? user.id : undefined

  // Fetch patients for this hospital
  useEffect(() => {
    if (!hospitalId) {
      setPatients([])
      setLoading(false)
      setError(null)
      return
    }

    let cancelled = false
    const ctrl = new AbortController()
    const timeout = setTimeout(() => ctrl.abort(), 8000)

    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const url = `${API_BASE}/api/v1/auth/hospital/${hospitalId}/patients`
        const res = await fetch(url, {
          signal: ctrl.signal,
          headers: { Accept: "application/json" },
          credentials: "include",
        })

        if (!res.ok) {
          const body = await res.text().catch(() => "")
          throw new Error(`HTTP ${res.status}${body ? ` – ${body}` : ""}`)
        }

        const payload: PatientsResponse = await res.json()
        const list = Array.isArray(payload?.data) ? payload.data : []
        if (!cancelled) setPatients(list)
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load patients")
      } finally {
        clearTimeout(timeout)
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
      ctrl.abort()
      clearTimeout(timeout)
    }
  }, [hospitalId])

  // Fetch all policies once to map id -> name (for full labels)
  useEffect(() => {
    let cancelled = false
    const ctrl = new AbortController()

    ;(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/v1/policies`, {
          signal: ctrl.signal,
          headers: { Accept: "application/json" },
          credentials: "include",
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const payload = await res.json()
        const list: BackendPolicy[] = Array.isArray(payload?.data) ? payload.data : []
        if (cancelled) return
        const map: Record<string, string> = {}
        for (const p of list) {
          if (p?.id && p?.name) map[p.id] = p.name
        }
        setPolicyNameById(map)
      } catch {
        // non-fatal: we can still render with IDs
      } finally {
        if (!cancelled) setPoliciesLoaded(true)
      }
    })()

    return () => {
      cancelled = true
      ctrl.abort()
    }
  }, [])

  // simple client-side filtering
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return patients
    return patients.filter((p) => {
      const fields: string[] = [
        normalize(p.name).toLowerCase(),
        normalize(p.email).toLowerCase(),
        ...(p.ilnesses ?? []).flatMap((ill) => [
          normalize(ill.name).toLowerCase(),
          ...(ill.medications ?? []).map((m) => normalize(m).toLowerCase()),
        ]),
        ...(p.insuredAt ?? []).map((ref) => ref.toLowerCase()),
      ]
      return fields.some((f) => f.includes(term))
    })
  }, [patients, q])

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const openPolicyPdf = (policyId: string) => {
    // Open the direct PDF stream in a new tab
    const url = `${API_BASE}/api/v1/policies/${policyId}/pdf`
    window.open(url, "_blank", "noopener,noreferrer")
  }

  return (
    <RoleBasedLayout>
      <div className="space-y-6">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Users className="h-7 w-7 text-primary" />
              Patients
            </h1>
            <p className="text-muted-foreground mt-2">
              All patients associated with your hospital.
            </p>
          </div>

          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, email, illness, medication, or policy…"
              className="pl-10"
            />
          </div>
        </div>

        {/* states */}
        {!hospitalId && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertCircle className="h-5 w-5 mr-2 text-destructive" />
                Not authorized
              </CardTitle>
              <CardDescription>This page is only available to hospital users.</CardDescription>
            </CardHeader>
          </Card>
        )}

        {hospitalId && loading && (
          <Card>
            <CardHeader>
              <CardTitle>Loading patients…</CardTitle>
              <CardDescription>Please wait while we fetch data from the API.</CardDescription>
            </CardHeader>
          </Card>
        )}

        {hospitalId && error && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertCircle className="h-5 w-5 mr-2 text-destructive" />
                Failed to load
              </CardTitle>
              <CardDescription className="text-destructive break-words">{error}</CardDescription>
            </CardHeader>
          </Card>
        )}

        {hospitalId && !loading && !error && filtered.length === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>No patients</CardTitle>
              <CardDescription>No results found for your search.</CardDescription>
            </CardHeader>
          </Card>
        )}

        {/* list */}
        <div className="grid gap-4">
          {filtered.map((p) => {
            const illnesses = p.ilnesses ?? []
            const policyRefs = p.insuredAt ?? []
            const isOpen = open.has(p.id)

            const policyIds = policyRefs.map(extractPolicyId)

            return (
              <Card key={p.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  {/* Row header (always visible) */}
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-foreground truncate">{p.name}</h3>
                        <Badge variant="secondary" className="shrink-0">
                          {policyRefs.length} policy{policyRefs.length === 1 ? "" : "ies"}
                        </Badge>
                        <Badge variant="outline" className="shrink-0">
                          {illnesses.length} illness{illnesses.length === 1 ? "" : "es"}
                        </Badge>
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground inline-flex items-center gap-2 truncate">
                        <Mail className="h-3.5 w-3.5" />
                        <span className="truncate">{p.email}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-xs text-muted-foreground inline-flex items-center">
                        <Calendar className="h-3.5 w-3.5 mr-1" />
                        Joined {fmtDateFromFirestore(p.createdAt)}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggle(p.id)}
                        aria-expanded={isOpen}
                        aria-controls={`patient-details-${p.id}`}
                        className="inline-flex items-center"
                      >
                        {isOpen ? (
                          <>
                            Hide details <ChevronUp className="ml-2 h-4 w-4" />
                          </>
                        ) : (
                          <>
                            View details <ChevronDown className="ml-2 h-4 w-4" />
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Collapsible details */}
                  {isOpen && (
                    <div id={`patient-details-${p.id}`} className="mt-4 border-t pt-4 space-y-4">
                      {/* Policies — full names, clickable */}
                      <div>
                        <h4 className="font-medium text-foreground flex items-center mb-2">
                          <Shield className="h-4 w-4 mr-2 text-primary" />
                          Policies
                        </h4>
                        {policyIds.length ? (
                          <ul className="space-y-2">
                            {policyIds.map((pid) => {
                              const label = policyNameById[pid] || pid
                              return (
                                <li key={pid}>
                                  <button
                                    type="button"
                                    onClick={() => openPolicyPdf(pid)}
                                    className="text-primary underline underline-offset-4 hover:no-underline text-sm"
                                  >
                                    {label}
                                  </button>
                                </li>
                              )
                            })}
                          </ul>
                        ) : (
                          <p className="text-sm text-muted-foreground">No linked policies</p>
                        )}
                        {!policiesLoaded && (
                          <p className="text-xs text-muted-foreground mt-1">Loading policy names…</p>
                        )}
                      </div>

                      {/* Illnesses & medications */}
                      <div>
                        <h4 className="font-medium text-foreground flex items-center mb-2">
                          <Info className="h-4 w-4 mr-2 text-primary" />
                          Illnesses &amp; medications
                        </h4>
                        {illnesses.length ? (
                          <div className="space-y-2">
                            {illnesses.map((ill) => (
                              <div key={ill.name} className="text-sm p-2 rounded-md bg-muted/60 border border-border/40">
                                <span className="font-medium">{ill.name}</span>
                                {ill.medications?.length ? (
                                  <span className="text-muted-foreground"> — {ill.medications.join(", ")}</span>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">No recorded illnesses</p>
                        )}
                      </div>

                      {/* Meta */}
                      <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-4">
                        <span className="inline-flex items-center">
                          <Hash className="h-3.5 w-3.5 mr-1" />
                          ID: <span className="ml-1 font-mono">{p.id}</span>
                        </span>
                        <span>Role: {p.role}</span>
                      </div>

                      {/* Actions (placeholders) */}
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm">View record</Button>
                        <Button variant="outline" size="sm">Message</Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </RoleBasedLayout>
  )
}
