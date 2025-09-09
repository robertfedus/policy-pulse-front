import { useMemo, useState } from "react"
import { RoleBasedLayout } from "@/components/layout/role-based-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Activity, FileText, Loader2 } from "lucide-react"

const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/+$/, "") ?? ""

// ---- Types that match /affected_meds/run-by-id ----
type CoverageCovered = { type: "covered" }
type CoverageNotCovered = { type: "not_covered" }
type CoveragePercent = { type: "percent"; percent: number; copay?: number }
type CoverageEntry = CoverageCovered | CoverageNotCovered | CoveragePercent

type ImpactedMed = {
  medication: string
  old: CoverageEntry | null
  next: CoverageEntry | null
}

type AffectedPatient = {
  uid: string
  name: string
  email: string
  medicationsImpacted: ImpactedMed[]
}

type PolicyMeta = {
  id: string
  name: string
  version: number
  beFileName?: string
  effectiveDate?: string
}

type AffectedRunResponse = {
  ok: boolean
  runId: string
  changedMedications: string[]
  changeDetails: Record<string, { old: CoverageEntry | null; next: CoverageEntry | null }>
  affectedCount: number
  affectedPatients: AffectedPatient[]
  oldPolicy: PolicyMeta
  newPolicy: PolicyMeta
  comparedAt: string
}

export default function RecentChangesPage() {
  // --- Affected meds runner state ---
  const [oldPolicyId, setOldPolicyId] = useState("")
  const [newPolicyId, setNewPolicyId] = useState("")
  const [insuredPolicyId, setInsuredPolicyId] = useState("")
  const [persist, setPersist] = useState(true)
  const [runLoading, setRunLoading] = useState(false)
  const [runError, setRunError] = useState<string | null>(null)
  const [result, setResult] = useState<AffectedRunResponse | null>(null)

  // ---- Helpers to render coverage ----
  const coverageLabel = (entry: CoverageEntry | null) => {
    if (!entry) return { text: "—", variant: "outline" as const }
    if (entry.type === "covered") return { text: "Covered", variant: "default" as const }
    if (entry.type === "not_covered") return { text: "Not covered", variant: "secondary" as const }
    const copay = entry.copay != null ? ` (copay $${entry.copay})` : ""
    return { text: `${entry.percent}%${copay}`, variant: "default" as const }
  }

  const changeKind = (oldE: CoverageEntry | null, nextE: CoverageEntry | null) => {
    if (!oldE && nextE) return { text: "Newly covered", color: "text-green-700" }
    if (oldE && !nextE) return { text: "No longer covered", color: "text-red-700" }
    if (oldE && nextE) return { text: "Changed", color: "text-yellow-700" }
    return { text: "Unchanged", color: "text-muted-foreground" }
  }

  const fmtDate = (iso?: string) => {
    if (!iso) return "—"
    try { return new Date(iso).toLocaleDateString() } catch { return iso }
  }

  const runAffectedMeds = async () => {
    setRunError(null)
    setResult(null)
    try {
      if (!oldPolicyId || !newPolicyId || !insuredPolicyId) {
        throw new Error("Please fill all policy IDs before running.")
      }
      setRunLoading(true)
      const res = await fetch(`${API_BASE}/api/v1/affected_meds/run-by-id`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        credentials: "include",
        body: JSON.stringify({
          oldPolicyId,
          newPolicyId,
          insuredPolicyId,
          persist,
        }),
      })
      if (!res.ok) {
        const body = await res.text().catch(() => "")
        throw new Error(`HTTP ${res.status}${body ? ` – ${body}` : ""}`)
      }
      const payload: AffectedRunResponse = await res.json()
      setResult(payload)
    } catch (e: any) {
      setRunError(e?.message ?? "Failed to run analysis")
    } finally {
      setRunLoading(false)
    }
  }

  const openPolicyPdf = (id?: string) => {
    if (!id) return
    window.open(`${API_BASE}/api/v1/policies/${id}/pdf`, "_blank", "noopener,noreferrer")
  }

  // Derive a flat list of meds impact (sorted)
  const sortedChangedMeds = useMemo(() => {
    const arr = result?.changedMedications ?? []
    return [...arr].sort((a, b) => a.localeCompare(b))
  }, [result])

  return (
    <RoleBasedLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Activity className="h-7 w-7 text-primary" />
              Recent Changes
            </h1>
            <p className="text-muted-foreground mt-2">
              Analyze policy updates and see which patients and medications are affected.
            </p>
          </div>
        </div>

        {/* ================= Affected Patients Analyzer ================= */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Affected Patients by Policy Change
            </CardTitle>
            <CardDescription>
              Run <code>/api/v1/affected_meds/run-by-id</code> to compute the impact of a policy update.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Runner form */}
            <div className="grid md:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label htmlFor="oldPolicyId">Old Policy ID</Label>
                <Input
                  id="oldPolicyId"
                  value={oldPolicyId}
                  onChange={(e) => setOldPolicyId(e.target.value)}
                  placeholder="e.g., n5Yp…"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="newPolicyId">New Policy ID</Label>
                <Input
                  id="newPolicyId"
                  value={newPolicyId}
                  onChange={(e) => setNewPolicyId(e.target.value)}
                  placeholder="e.g., vBe…"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="insuredPolicyId">Insured Policy ID</Label>
                <Input
                  id="insuredPolicyId"
                  value={insuredPolicyId}
                  onChange={(e) => setInsuredPolicyId(e.target.value)}
                  placeholder="Usually same as old"
                />
              </div>
              <div className="space-y-1">
                <Label className="block">Persist to DB</Label>
                <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <input type="checkbox" checked={persist} onChange={(e) => setPersist(e.target.checked)} />
                  <span>persist</span>
                </label>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={runAffectedMeds}
                disabled={runLoading || !oldPolicyId || !newPolicyId || !insuredPolicyId}
              >
                {runLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Running…
                  </>
                ) : (
                  <>Run Analysis</>
                )}
              </Button>
              {runError && <span className="text-sm text-destructive">{runError}</span>}
            </div>

            {/* Results */}
            {result && (
              <div className="space-y-6">
                {/* Header summary */}
                <div className="grid lg:grid-cols-3 gap-4">
                  <Card className="bg-muted/40">
                    <CardContent className="p-4">
                      <div className="text-xs text-muted-foreground">Old Policy</div>
                      <div className="font-medium">{result.oldPolicy.name}</div>
                      <div className="text-sm text-muted-foreground">
                        v{result.oldPolicy.version} • Eff. {fmtDate(result.oldPolicy.effectiveDate)}
                        {result.oldPolicy.beFileName ? ` • ${result.oldPolicy.beFileName}` : ""}
                      </div>
                      <div className="mt-2">
                        <Button variant="outline" size="sm" onClick={() => openPolicyPdf(result.oldPolicy.id)}>
                          <FileText className="h-4 w-4 mr-2" /> Open PDF
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-muted/40">
                    <CardContent className="p-4">
                      <div className="text-xs text-muted-foreground">New Policy</div>
                      <div className="font-medium">{result.newPolicy.name}</div>
                      <div className="text-sm text-muted-foreground">
                        v{result.newPolicy.version} • Eff. {fmtDate(result.newPolicy.effectiveDate)}
                        {result.newPolicy.beFileName ? ` • ${result.newPolicy.beFileName}` : ""}
                      </div>
                      <div className="mt-2">
                        <Button variant="outline" size="sm" onClick={() => openPolicyPdf(result.newPolicy.id)}>
                          <FileText className="h-4 w-4 mr-2" /> Open PDF
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-muted/40">
                    <CardContent className="p-4 space-y-2">
                      <div className="text-xs text-muted-foreground">Run</div>
                      <div className="text-sm">
                        <span className="font-medium">ID:</span> {result.runId}
                      </div>
                      <div className="text-sm">
                        <span className="font-medium">Compared:</span>{" "}
                        {new Date(result.comparedAt).toLocaleString()}
                      </div>
                      <div className="text-sm">
                        <span className="font-medium">Patients Affected:</span> {result.affectedCount}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {sortedChangedMeds.map((m) => (
                          <Badge key={m} variant="secondary">
                            {m}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Change details by medication */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Change Details by Medication</CardTitle>
                    <CardDescription>Old vs next coverage for each changed medication.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {sortedChangedMeds.length === 0 && (
                      <div className="text-sm text-muted-foreground">No changed medications.</div>
                    )}
                    {sortedChangedMeds.map((med) => {
                      const diff = result.changeDetails[med]
                      const kind = changeKind(diff?.old ?? null, diff?.next ?? null)
                      const oldL = coverageLabel(diff?.old ?? null)
                      const nextL = coverageLabel(diff?.next ?? null)
                      return (
                        <div key={med} className="p-3 rounded-md border bg-card">
                          <div className="flex items-center justify-between">
                            <div className="font-medium">{med}</div>
                            <div className={`text-xs ${kind.color}`}>{kind.text}</div>
                          </div>
                          <div className="mt-2 flex items-center gap-2 text-sm">
                            <Badge variant={oldL.variant}>Old: {oldL.text}</Badge>
                            <span className="opacity-60">→</span>
                            <Badge variant={nextL.variant}>Next: {nextL.text}</Badge>
                          </div>
                        </div>
                      )
                    })}
                  </CardContent>
                </Card>

                {/* Affected patients list */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Affected Patients ({result.affectedPatients.length})
                    </CardTitle>
                    <CardDescription>Each patient and their impacted medications.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {result.affectedPatients.length === 0 && (
                      <div className="text-sm text-muted-foreground">
                        No patients affected by this change.
                      </div>
                    )}
                    {result.affectedPatients.map((p) => (
                      <div key={p.uid} className="p-3 rounded-lg border bg-card">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-medium truncate">{p.name}</div>
                            <div className="text-xs text-muted-foreground truncate">{p.email}</div>
                          </div>
                          <Badge variant="secondary">
                            {p.medicationsImpacted.length} meds impacted
                          </Badge>
                        </div>

                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          {p.medicationsImpacted.map((im) => {
                            const oldL = coverageLabel(im.old)
                            const nextL = coverageLabel(im.next)
                            const kind = changeKind(im.old, im.next)
                            return (
                              <div
                                key={`${p.uid}-${im.medication}`}
                                className="rounded-md border px-2 py-1 text-sm"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="truncate font-medium">{im.medication}</span>
                                  <span className={`text-xs ${kind.color}`}>{kind.text}</span>
                                </div>
                                <div className="mt-1 flex items-center gap-2">
                                  <Badge variant={oldL.variant}>Old: {oldL.text}</Badge>
                                  <span className="opacity-60">→</span>
                                  <Badge variant={nextL.variant}>Next: {nextL.text}</Badge>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            )}
          </CardContent>
        </Card>
        {/* ================= end analyzer ================= */}
      </div>
    </RoleBasedLayout>
  )
}
