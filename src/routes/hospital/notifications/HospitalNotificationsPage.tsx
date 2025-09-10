import { useEffect, useMemo, useRef, useState } from "react"
import { RoleBasedLayout } from "@/components/layout/role-based-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Activity,
  Shield,
  History,
  Compass as Compare,
  AlertCircle,
  FileText,
  ExternalLink,
  Loader2,
  Building2,
  Users
} from "lucide-react"

const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/+$/, "") ?? ""

// ----------------- Types -----------------
type CoverageEntry =
  | { type: "covered" }
  | { type: "percent"; percent: number; copay?: number }
  | { type: "not_covered" }

interface BackendPolicy {
  id: string
  name: string
  summary?: string | { ok: boolean; reason?: string }
  beFileName?: string
  effectiveDate: string | null
  version: number | string
  coverage_map?: Record<string, CoverageEntry>
  createdAt?: { _seconds: number; _nanoseconds: number }
  updatedAt?: { _seconds: number; _nanoseconds: number }
  insuranceCompanyRef?: string
}

type NormalizedPolicy = Omit<BackendPolicy, "version" | "coverage_map"> & {
  version: number
  coverage_map: Record<string, CoverageEntry>
}

type PoliciesResponse = { data: BackendPolicy[] } | { data: BackendPolicy }
type PdfUrlResponse = { url?: string }

// /policies/changes/versions
type VersionsPair = { v1: number | string; id1: string; v2: number | string; id2: string }
type ChangesVersionsResponse = {
  data: Record<string /* "<PolicyName>::insurance_companies/<companyId>" */, VersionsPair[]>
}

// Affected patients API
type CoverageCovered = { type: "covered" }
type CoverageNotCovered = { type: "not_covered" }
type CoveragePercent = { type: "percent"; percent: number; copay?: number }
type AffectedCoverageEntry = CoverageCovered | CoverageNotCovered | CoveragePercent

type ImpactedMed = {
  medication: string
  old: AffectedCoverageEntry | null
  next: AffectedCoverageEntry | null
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
  changeDetails: Record<string, { old: AffectedCoverageEntry | null; next: AffectedCoverageEntry | null }>
  affectedCount: number
  affectedPatients: AffectedPatient[]
  oldPolicy: PolicyMeta
  newPolicy: PolicyMeta
  comparedAt: string
}

// ----------------- Helpers -----------------
const normalizePolicy = (p: BackendPolicy): NormalizedPolicy => ({
  ...p,
  version: Number((p as any).version) || 0,
  coverage_map: (p.coverage_map ?? {}) as Record<string, CoverageEntry>,
})

const companyNameFromRef = (ref?: string) => {
  if (!ref) return "Unknown Insurer"
  const id = ref.split("/")[1] ?? ref
  return `Insurer ${id.slice(0, 6)}…`
}

const fmtDate = (iso: string | null | undefined) => {
  if (!iso) return "—"
  try { return new Date(iso).toLocaleDateString() } catch { return iso ?? "—" }
}

const humanCoverage = (k: string, v: CoverageEntry) => {
  switch (v.type) {
    case "covered": return `${k}: covered`
    case "not_covered": return `${k}: not covered`
    case "percent": {
      const copay = v.copay != null ? ` (copay $${v.copay})` : ""
      return `${k}: ${v.percent}%${copay}`
    }
  }
}

const toSummaryText = (summary: BackendPolicy["summary"]): string | null => {
  if (typeof summary === "string") return summary
  if (summary && typeof summary === "object") {
    if ("reason" in summary && summary.reason) return String(summary.reason)
    try { return JSON.stringify(summary) } catch { return null }
  }
  return null
}

// Diff helpers
type DiffRow =
  | { kind: "added"; key: string; after: CoverageEntry }
  | { kind: "removed"; key: string; before: CoverageEntry }
  | { kind: "changed"; key: string; before: CoverageEntry; after: CoverageEntry }

const isEqualCoverage = (a?: CoverageEntry, b?: CoverageEntry) => JSON.stringify(a) === JSON.stringify(b)

function diffCoverageMaps(base: Record<string, CoverageEntry>, target: Record<string, CoverageEntry>): DiffRow[] {
  const rows: DiffRow[] = []
  const keys = new Set([...Object.keys(base || {}), ...Object.keys(target || {})])
  for (const k of keys) {
    const before = base?.[k]
    const after = target?.[k]
    if (before && !after) rows.push({ kind: "removed", key: k, before })
    else if (!before && after) rows.push({ kind: "added", key: k, after })
    else if (before && after && !isEqualCoverage(before, after)) rows.push({ kind: "changed", key: k, before, after })
  }
  const order = { added: 0, changed: 1, removed: 2 } as const
  rows.sort((a, b) => (order[(a as any).kind] - order[(b as any).kind]) || a.key.localeCompare(b.key))
  return rows
}

// Resolve PDF URL (prefer /pdf-url, fallback /pdf)
async function resolvePdfUrl(policyId: string): Promise<string> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/policies/${policyId}/pdf-url`, {
      headers: { Accept: "application/json" },
      credentials: "include",
    })
    if (res.ok) {
      const payload: PdfUrlResponse = await res.json()
      if (payload?.url) return payload.url
    }
  } catch {}
  return `${API_BASE}/api/v1/policies/${policyId}/pdf`
}

// ----------------- Page -----------------
export default function RecentChangesPage() {
  const [pairs, setPairs] = useState<
    Array<{
      key: string
      policyName: string
      companyRef: string
      v1: number
      id1: string
      v2: number
      id2: string
    }>
  >([])
  const [policiesById, setPoliciesById] = useState<Record<string, NormalizedPolicy>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // UI state
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"list" | "compare">("list")

  // Affected patients cache: key -> {loading, error, data}
  const [affected, setAffected] = useState<Record<
    string,
    { loading: boolean; error: string | null; data: AffectedRunResponse | null }
  >>({})

  // 1) Load changes/versions
  useEffect(() => {
    let cancelled = false
    const ctrl = new AbortController()
    ;(async () => {
      setLoading(true); setError(null)
      try {
        const res = await fetch(`${API_BASE}/api/v1/policies/changes/versions`, {
          signal: ctrl.signal,
          headers: { Accept: "application/json" },
          credentials: "include",
        })
        if (!res.ok) {
          const body = await res.text().catch(() => "")
          throw new Error(`HTTP ${res.status}${body ? ` – ${body}` : ""}`)
        }
        const payload: ChangesVersionsResponse = await res.json()
        const out: Array<{
          key: string; policyName: string; companyRef: string; v1: number; id1: string; v2: number; id2: string
        }> = []

        for (const k of Object.keys(payload?.data ?? {})) {
          const [name, companyRef = ""] = k.split("::")
          const arr = payload.data[k] ?? []
          for (const item of arr) {
            out.push({
              key: `${k}::${item.id1}->${item.id2}`,
              policyName: name,
              companyRef,
              v1: Number(item.v1) || 0,
              id1: item.id1,
              v2: Number(item.v2) || 0,
              id2: item.id2,
            })
          }
        }

        out.sort((a, b) => a.policyName.localeCompare(b.policyName) || b.v2 - a.v2)

        if (!cancelled) setPairs(out)
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load recent changes")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true; ctrl.abort() }
  }, [])

  // 2) Fetch details for any missing policy ids (id1 & id2)
  useEffect(() => {
    const need = new Set<string>()
    for (const p of pairs) {
      if (!policiesById[p.id1]) need.add(p.id1)
      if (!policiesById[p.id2]) need.add(p.id2)
    }
    const ids = Array.from(need)
    if (ids.length === 0) return

    let cancelled = false
    const ctrl = new AbortController()
    ;(async () => {
      try {
        const results = await Promise.allSettled(
          ids.map(async (id) => {
            const res = await fetch(`${API_BASE}/api/v1/policies/${id}`, {
              signal: ctrl.signal,
              headers: { Accept: "application/json" },
              credentials: "include",
            })
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const payload: PoliciesResponse = await res.json()
            const raw = Array.isArray((payload as any).data) ? (payload as any).data[0] : (payload as any).data
            return normalizePolicy(raw as BackendPolicy)
          })
        )
        if (cancelled) return
        setPoliciesById((prev) => {
          const next = { ...prev }
          for (const r of results) {
            if (r.status === "fulfilled" && r.value?.id) next[r.value.id] = r.value
          }
          return next
        })
      } catch {/* ignore */}
    })()
    return () => { cancelled = true; ctrl.abort() }
  }, [pairs, policiesById])

  // Combine pairs with loaded policies (filter ones we can show)
  const ready = useMemo(() => {
    return pairs
      .map((p) => {
        const prev = policiesById[p.id1]
        const curr = policiesById[p.id2]
        if (!prev || !curr) return null
        return { ...p, previous: prev, current: curr }
      })
      .filter(Boolean) as Array<typeof pairs[number] & { previous: NormalizedPolicy; current: NormalizedPolicy }>
  }, [pairs, policiesById])

  // Kick off affected patients call for a given pair (id1->id2)
  const runAffectedForPair = async (pairKey: string, oldPolicyId: string, newPolicyId: string) => {
    setAffected((prev) => ({ ...prev, [pairKey]: { loading: true, error: null, data: prev[pairKey]?.data ?? null } }))
    try {
      const res = await fetch(`${API_BASE}/api/v1/affected_meds/run-by-id`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        credentials: "include",
        body: JSON.stringify({
          oldPolicyId,
          newPolicyId,
          insuredPolicyId: oldPolicyId, // per your example
          persist: true,
        }),
      })
      if (!res.ok) {
        const body = await res.text().catch(() => "")
        throw new Error(`HTTP ${res.status}${body ? ` – ${body}` : ""}`)
      }
      const payload: AffectedRunResponse = await res.json()
      setAffected((prev) => ({ ...prev, [pairKey]: { loading: false, error: null, data: payload } }))
    } catch (e: any) {
      setAffected((prev) => ({ ...prev, [pairKey]: { loading: false, error: e?.message ?? "Failed to load", data: null } }))
    }
  }

  return (
    <RoleBasedLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Activity className="h-7 w-7 text-primary" />
              Recent Changes
            </h1>
            <p className="text-muted-foreground mt-2">
              Detected policy version updates. Open PDFs, view coverage diffs, and see which patients are affected.
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-4">
          <TabsList>
            <TabsTrigger value="list">Changes</TabsTrigger>
            <TabsTrigger value="compare" disabled={!expandedId}>Compare</TabsTrigger>
          </TabsList>

          {/* ---------------- LIST OF CHANGES ---------------- */}
          <TabsContent value="list" className="space-y-4">
            {loading && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Loading recent changes…
                  </CardTitle>
                  <CardDescription>Fetching version pairs and policy details.</CardDescription>
                </CardHeader>
              </Card>
            )}

            {error && (
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

            {!loading && !error && ready.length === 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>No recent changes</CardTitle>
                  <CardDescription>The API returned no version pairs or policies are still loading.</CardDescription>
                </CardHeader>
              </Card>
            )}

            {ready.map((row) => {
              const insurer = companyNameFromRef(row.current.insuranceCompanyRef || row.previous.insuranceCompanyRef)
              const diffs = diffCoverageMaps(row.previous.coverage_map, row.current.coverage_map)
              const changedCount = diffs.length
              const sumText = toSummaryText(row.current.summary) || toSummaryText(row.previous.summary)

              const openPolicyPdf = (policyId: string) => {
                window.open(`${API_BASE}/api/v1/policies/${policyId}/pdf`, "_blank", "noopener,noreferrer")
              }

              const aff = affected[row.key]
              const haveData = !!aff?.data

              return (
                <Card key={row.key} className="overflow-hidden">
                  <CardHeader>
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <CardTitle className="flex items-center gap-2">
                          <Shield className="h-5 w-5 text-primary" />
                          <span className="truncate">{row.policyName}</span>
                          <span className="ml-2 text-sm text-muted-foreground">
                            v{row.v1} → v{row.v2}
                          </span>
                        </CardTitle>
                        <CardDescription className="space-x-2">
                          <span className="inline-flex items-center"><Building2 className="h-3.5 w-3.5 mr-1" /> {insurer}</span>
                          <span>• Prev eff: {fmtDate(row.previous.effectiveDate)}</span>
                          <span>• Curr eff: {fmtDate(row.current.effectiveDate)}</span>
                          {row.current.beFileName && (
                            <>
                              <span>•</span>
                              <span className="inline-flex items-center">
                                <FileText className="h-3.5 w-3.5 mr-1" />
                                {row.current.beFileName}
                              </span>
                            </>
                          )}
                        </CardDescription>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="secondary">{changedCount} changes</Badge>
                        <Button variant="outline" size="sm" onClick={() => openPolicyPdf(row.id1)}>
                          <ExternalLink className="h-4 w-4 mr-2" /> Open v{row.v1}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => openPolicyPdf(row.id2)}>
                          <ExternalLink className="h-4 w-4 mr-2" /> Open v{row.v2}
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => { setExpandedId(row.key); setActiveTab("compare") }}
                          title="View detailed diff and PDFs"
                        >
                          Compare
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {sumText && <p className="text-sm text-muted-foreground">{sumText}</p>}

                    {/* Inline mini diff preview (first 6 items) */}
                    <div className="space-y-2">
                      <h4 className="font-medium text-foreground flex items-center">
                        <History className="h-4 w-4 mr-2" />
                        Coverage changes (preview)
                      </h4>
                      {changedCount === 0 && (
                        <div className="text-sm text-muted-foreground">No coverage changes detected between these versions.</div>
                      )}
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {diffs.slice(0, 6).map((d) => {
                          const label =
                            d.kind === "added" ? "Added" :
                            d.kind === "removed" ? "Removed" : "Changed"
                          return (
                            <div key={`${row.key}-${d.kind}-${d.key}`} className="text-sm p-2 rounded-md bg-muted/60 border border-border/40">
                              <div className="font-medium">{d.key} — {label}</div>
                              <div className="mt-1 text-xs opacity-90 space-y-1">
                                {"before" in d && <div><span className="font-semibold">Before: </span>{humanCoverage(d.key, (d as any).before)}</div>}
                                {"after" in d && <div><span className="font-semibold">After: </span>{humanCoverage(d.key, (d as any).after)}</div>}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      {changedCount > 6 && (
                        <div className="text-xs text-muted-foreground">
                          +{changedCount - 6} more changes — use <em>Compare</em> to view all
                        </div>
                      )}
                    </div>

                    {/* -------- Affected patients -------- */}
                    <div className="space-y-2">
                      <h4 className="font-medium text-foreground flex items-center">
                        <Users className="h-4 w-4 mr-2" />
                        Affected patients
                      </h4>

                      {/* Actions / status */}
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => runAffectedForPair(row.key, row.id1, row.id2)}
                          disabled={aff?.loading}
                          title="Run affected patients analysis"
                        >
                          {aff?.loading ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Running…</>) : "Load affected"}
                        </Button>
                        {aff?.error && <span className="text-sm text-destructive">{aff.error}</span>}
                        {haveData && (
                          <Badge variant="secondary">
                            {aff!.data!.affectedCount} affected
                          </Badge>
                        )}
                      </div>

                      {/* Results */}
                      {haveData && (
                        <div className="space-y-2">
                          {/* Changed meds for context */}
                          {aff!.data!.changedMedications?.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {aff!.data!.changedMedications.slice(0, 20).map((m) => (
                                <Badge key={m} variant="outline">{m}</Badge>
                              ))}
                              {aff!.data!.changedMedications.length > 20 && (
                                <span className="text-xs text-muted-foreground">
                                  +{aff!.data!.changedMedications.length - 20} more meds
                                </span>
                              )}
                            </div>
                          )}

                          {/* Patients list (trim to first 10 for UI sanity) */}
                          <div className="grid gap-2">
                            {aff!.data!.affectedPatients.slice(0, 10).map((p) => (
                              <div key={p.uid} className="p-3 rounded-md border bg-card">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="min-w-0">
                                    <div className="font-medium truncate">{p.name}</div>
                                    <div className="text-xs text-muted-foreground truncate">{p.email}</div>
                                  </div>
                                  <Badge variant="secondary">
                                    {p.medicationsImpacted.length} meds impacted
                                  </Badge>
                                </div>

                                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                                  {p.medicationsImpacted.map((im) => {
                                    const oldTxt = im.old
                                      ? im.old.type === "covered"
                                        ? "covered"
                                        : im.old.type === "not_covered"
                                          ? "not covered"
                                          : `${im.old.percent}%${im.old.copay != null ? ` (copay $${im.old.copay})` : ""}`
                                      : "—"
                                    const nextTxt = im.next
                                      ? im.next.type === "covered"
                                        ? "covered"
                                        : im.next.type === "not_covered"
                                          ? "not covered"
                                          : `${im.next.percent}%${im.next.copay != null ? ` (copay $${im.next.copay})` : ""}`
                                      : "—"

                                    const kind =
                                      (!im.old && im.next) ? { text: "Newly covered", color: "text-green-700" } :
                                      (im.old && !im.next) ? { text: "No longer covered", color: "text-red-700" } :
                                      (im.old && im.next && JSON.stringify(im.old) !== JSON.stringify(im.next))
                                        ? { text: "Changed", color: "text-yellow-700" }
                                        : { text: "Unchanged", color: "text-muted-foreground" }

                                    return (
                                      <div key={`${p.uid}-${im.medication}`} className="rounded-md border px-2 py-1 text-sm">
                                        <div className="flex items-center justify-between">
                                          <span className="truncate font-medium">{im.medication}</span>
                                          <span className={`text-xs ${kind.color}`}>{kind.text}</span>
                                        </div>
                                        <div className="mt-1 flex items-center gap-2">
                                          <Badge variant="outline">Old: {oldTxt}</Badge>
                                          <span className="opacity-60">→</span>
                                          <Badge variant="default">Next: {nextTxt}</Badge>
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>

                          {aff!.data!.affectedPatients.length > 10 && (
                            <div className="text-xs text-muted-foreground">
                              Showing first 10 of {aff!.data!.affectedPatients.length}. Re-run the analysis in the Compare tab for deeper review if needed.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </TabsContent>

          {/* ---------------- COMPARE (expanded pair) ---------------- */}
          <TabsContent value="compare" className="space-y-4">
            {!expandedId && (
              <Card>
                <CardHeader>
                  <CardTitle>Select a change to compare</CardTitle>
                  <CardDescription>Use the Compare button from the list to open details here.</CardDescription>
                </CardHeader>
              </Card>
            )}

            {expandedId && (() => {
              const selected = ready.find(r => r.key === expandedId)
              if (!selected) {
                return (
                  <Card>
                    <CardHeader>
                      <CardTitle>Not available</CardTitle>
                      <CardDescription>The selected pair is no longer available.</CardDescription>
                    </CardHeader>
                  </Card>
                )
              }
              return (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Compare className="h-5 w-5 text-primary" />
                        {selected.policyName} — v{selected.v1} → v{selected.v2}
                      </CardTitle>
                      <CardDescription>
                        {companyNameFromRef(selected.current.insuranceCompanyRef || selected.previous.insuranceCompanyRef)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <CoverageDiff base={selected.previous} target={selected.current} />
                      <PdfSideBySide current={selected.current} previous={selected.previous} />
                    </CardContent>
                  </Card>
                </>
              )
            })()}
          </TabsContent>
        </Tabs>
      </div>
    </RoleBasedLayout>
  )
}

// ---------- Coverage diff (previous vs current) ----------
function CoverageDiff({ base, target }: { base: NormalizedPolicy; target: NormalizedPolicy }) {
  const rows = useMemo(() => diffCoverageMaps(base.coverage_map || {}, target.coverage_map || {}), [base, target])

  if (rows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Coverage Differences</CardTitle>
          <CardDescription>No differences detected between these versions.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Coverage Differences</CardTitle>
        <CardDescription>
          Comparing <span className="font-medium">v{Number(base.version) || 0}</span> → <span className="font-medium">v{Number(target.version) || 0}</span> of <span className="font-medium">{target.name}</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-2">
          {rows.map((row) => {
            const color =
              row.kind === "added" ? "bg-green-100 text-green-800 border-green-200" :
              row.kind === "changed" ? "bg-yellow-100 text-yellow-800 border-yellow-200" :
              "bg-red-100 text-red-800 border-red-200"
            return (
              <div key={`${row.kind}-${row.key}`} className={`rounded-md border px-3 py-2 text-sm ${color}`}>
                <div className="font-medium">
                  {row.key} — {row.kind === "added" ? "Added" : row.kind === "removed" ? "Removed" : "Changed"}
                </div>
                <div className="mt-1 text-xs opacity-90 space-y-1">
                  {"before" in row && (
                    <div>
                      <span className="font-semibold">Before: </span>
                      {humanCoverage(row.key, (row as any).before)}
                    </div>
                  )}
                  {"after" in row && (
                    <div>
                      <span className="font-semibold">After: </span>
                      {humanCoverage(row.key, (row as any).after)}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// ---------- Side-by-side PDFs (no scroll sync) ----------
function PdfSideBySide({ current, previous }: { current: NormalizedPolicy; previous: NormalizedPolicy }) {
  const [leftUrl, setLeftUrl] = useState<string | null>(null)   // previous
  const [rightUrl, setRightUrl] = useState<string | null>(null) // current
  const [err, setErr] = useState<string | null>(null)
  const leftRef = useRef<HTMLIFrameElement>(null)
  const rightRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    let cancel = false
    setErr(null)
    setLeftUrl(null)
    setRightUrl(null)

    ;(async () => {
      try {
        const [l, r] = await Promise.all([resolvePdfUrl(previous.id), resolvePdfUrl(current.id)])
        if (!cancel) {
          setLeftUrl(l)
          setRightUrl(r)
        }
      } catch (e: any) {
        if (!cancel) setErr(e?.message ?? "Failed to load PDF URLs")
      }
    })()

    return () => { cancel = true }
  }, [current.id, previous.id])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-foreground">PDFs (Previous vs Current)</h4>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => leftUrl && window.open(leftUrl, "_blank", "noopener")}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Open Previous
          </Button>
          <Button variant="outline" size="sm" onClick={() => rightUrl && window.open(rightUrl, "_blank", "noopener")}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Open Current
          </Button>
        </div>
      </div>

      {err && <div className="text-sm text-destructive">Error: {err}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="border rounded-md overflow-hidden bg-muted/30">
          <div className="px-3 py-2 border-b text-sm">
            <span className="font-medium">{previous.name}</span> &nbsp;•&nbsp; v{Number(previous.version) || 0} (Previous)
          </div>
          <iframe ref={leftRef} title="Previous PDF" src={leftUrl ?? ""} className="w-full h-[75vh] bg-white" />
        </div>

        <div className="border rounded-md overflow-hidden bg-muted/30">
          <div className="px-3 py-2 border-b text-sm">
            <span className="font-medium">{current.name}</span> &nbsp;•&nbsp; v{Number(current.version) || 0} (Current)
          </div>
          <iframe ref={rightRef} title="Current PDF" src={rightUrl ?? ""} className="w-full h-[75vh] bg-white" />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        PDFs open in the browser’s viewer. Use the “Open” buttons to view them in new tabs.
      </p>
    </div>
  )
}
