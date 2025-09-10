import React, { useEffect, useMemo, useState } from "react"
import { RoleBasedLayout } from "@/components/layout/role-based-layout"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Activity,
  Shield,
  FileText,
  Pill,
  Stethoscope,
  Loader2,
  AlertTriangle,
  ExternalLink,
  Clock,
} from "lucide-react"

const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/+$/, "") ?? ""
const api = (path: string) => `${API_BASE}/api/v1${path}`

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
  updatedAt?: FirestoreTimestamp
}
type PatientsResponse = { data: Patient[] }

const tsToDate = (ts?: FirestoreTimestamp) =>
  ts ? new Date(ts._seconds * 1000 + Math.floor(ts._nanoseconds / 1e6)) : undefined

const extractPolicyId = (ref: string) => ref.split("/")[1] ?? ref

export default function PatientDashboard() {
  const { user } = useAuth()
  const [me, setMe] = useState<Patient | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const ctrl = new AbortController()

    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(api("/auth/patients"), {
          signal: ctrl.signal,
          headers: { Accept: "application/json" },
          credentials: "include",
          cache: "no-store",
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const payload: PatientsResponse = await res.json()
        const list = Array.isArray(payload?.data) ? payload.data : []

        // pick current user by id, fallback by email
        const byId = user?.id ? list.find((p) => p.id === user.id) : undefined
        const byEmail = !byId && user?.email ? list.find((p) => p.email === user.email) : undefined
        const mine = byId ?? byEmail ?? null

        if (!cancelled) setMe(mine)
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load your data")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
      ctrl.abort()
    }
  }, [user?.id, user?.email])

  // -------- derived data (from me only) ----------
  const illnesses: Illness[] = useMemo(() => {
    if (!me) return []
    return (me.illnesses ?? me.ilnesses ?? []).map((i) => ({
      name: i?.name ?? "—",
      medications: Array.isArray(i?.medications) ? i.medications : [],
    }))
  }, [me])

  const uniqueMedications = useMemo(() => {
    const s = new Set<string>()
    illnesses.forEach((ill) => ill.medications.forEach((m) => s.add(String(m ?? "").trim())))
    return Array.from(s).filter(Boolean)
  }, [illnesses])

  const policies = (me?.insuredAt ?? []).map(extractPolicyId)
  const created = tsToDate(me?.createdAt)
  const updated = tsToDate(me?.updatedAt)

  const openPolicyPdf = (policyId: string) => {
    const url = `${API_BASE}/api/v1/policies/${policyId}/pdf`
    window.open(url, "_blank", "noopener,noreferrer")
  }

  return (
    <RoleBasedLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Patient Portal</h1>
          <p className="text-muted-foreground mt-2">
            Your illnesses, medications, and linked insurance policies.
          </p>
        </div>

        {loading && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading your data…
              </CardTitle>
              <CardDescription>Fetching from /api/v1/auth/patients</CardDescription>
            </CardHeader>
          </Card>
        )}

        {error && (
          <Card className="border-destructive/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Couldn’t load data
              </CardTitle>
              <CardDescription className="break-words">{error}</CardDescription>
            </CardHeader>
          </Card>
        )}

        {!loading && !error && !me && (
          <Card>
            <CardHeader>
              <CardTitle>No matching profile found</CardTitle>
              <CardDescription>
                We couldn’t find your record in /auth/patients using your account.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {!loading && !error && me && (
          <>
            {/* KPIs (only data available from /auth/patients) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Policies Linked</CardTitle>
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{policies.length}</div>
                  <p className="text-xs text-muted-foreground">From your account</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Illnesses</CardTitle>
                  <Stethoscope className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{illnesses.length}</div>
                  <p className="text-xs text-muted-foreground">Tracked in your profile</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Unique Medications</CardTitle>
                  <Pill className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{uniqueMedications.length}</div>
                  <p className="text-xs text-muted-foreground">Across all illnesses</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Account Status</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">Active</div>
                  <p className="text-xs text-muted-foreground">
                    Member since {created ? created.toLocaleDateString() : "—"}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Illnesses & Medications */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="mr-2 h-5 w-5 text-primary" />
                  Your Illnesses & Medications
                </CardTitle>
                <CardDescription>From /api/v1/auth/patients</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {illnesses.length === 0 && (
                  <p className="text-sm text-muted-foreground">No illnesses on file.</p>
                )}
                {illnesses.map((ill) => (
                  <div key={ill.name} className="p-3 rounded-md border bg-card">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{ill.name || "Illness"}</div>
                      <Badge variant="outline">{ill.medications.length} med(s)</Badge>
                    </div>
                    {ill.medications.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {ill.medications.map((m) => (
                          <Badge key={m} variant="secondary">{m}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Policies Linked */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="mr-2 h-5 w-5 text-primary" />
                  Your Policies
                </CardTitle>
                <CardDescription>Open PDFs if available (hospital may restrict access)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {policies.length === 0 && (
                  <p className="text-sm text-muted-foreground">No policies linked to your account.</p>
                )}
                {policies.map((pid) => (
                  <div key={pid} className="flex items-center justify-between rounded-md border px-3 py-2">
                    <div className="text-sm">
                      <span className="font-medium">Policy ID:</span> {pid}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openPolicyPdf(pid)}
                      title="Open policy PDF"
                    >
                      Open PDF
                      <ExternalLink className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Profile Activity (dates from your record) */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="mr-2 h-5 w-5 text-primary" />
                  Profile Activity
                </CardTitle>
                <CardDescription>Timestamps from your account</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="p-3 rounded-md border bg-muted/40">
                  <div className="font-medium">Created</div>
                  <div className="text-muted-foreground">
                    {created ? created.toLocaleString() : "—"}
                  </div>
                </div>
                <div className="p-3 rounded-md border bg-muted/40">
                  <div className="font-medium">Last Updated</div>
                  <div className="text-muted-foreground">
                    {updated ? updated.toLocaleString() : "—"}
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </RoleBasedLayout>
  )
}
