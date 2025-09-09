import { useEffect, useMemo, useRef, useState } from "react"
import { RoleBasedLayout } from "@/components/layout/role-based-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Shield, History, Compass as Compare, AlertCircle, FileText, ExternalLink, Plus } from "lucide-react"
import { useNavigate } from "react-router-dom"

// --- shared with login style ---
const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/+$/, "") ?? ""

// ----------------- Types -----------------
type CoverageEntry =
  | { type: "covered" }
  | { type: "percent"; percent: number; copay?: number }
  | { type: "not_covered" }

export interface BackendPolicy {
  id: string
  name: string
  summary?: string | { ok: boolean; reason?: string } // <-- widened to handle object summaries
  beFileName?: string
  effectiveDate: string | null
  version: number
  coverage_map: Record<string, CoverageEntry>
  createdAt?: { _seconds: number; _nanoseconds: number }
  updatedAt?: { _seconds: number; _nanoseconds: number }
  insuranceCompanyRef?: string
}

interface PoliciesResponse { data: BackendPolicy[] }
interface CompanyPoliciesResponse { data: BackendPolicy[] }
interface PdfUrlResponse { url?: string }

// ----------------- Helpers -----------------
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

// Convert possibly-object summary to a string
const toSummaryText = (summary: BackendPolicy["summary"]): string | null => {
  if (typeof summary === "string") return summary
  if (summary && typeof summary === "object") {
    if ("reason" in summary && summary.reason) return String(summary.reason)
    // fallback textualization
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

// Fallback-aware fetch: try company endpoint first, then fall back to global list
async function fetchCompanyPoliciesWithFallback(companyId: string): Promise<BackendPolicy[]> {
  // 1) try /policies/insurance-company/:companyId
  try {
    const res = await fetch(`${API_BASE}/api/v1/policies/insurance-company/${companyId}`, {
      headers: { Accept: "application/json" },
      credentials: "include",
    })
    if (res.ok) {
      const payload: CompanyPoliciesResponse = await res.json()
      if (Array.isArray(payload?.data)) return payload.data
      return []
    }
    // Non-OK -> fall through to fallback
  } catch {
    // Network or server error -> fallback below
  }

  // 2) fallback: fetch all and filter locally
  const allRes = await fetch(`${API_BASE}/api/v1/policies`, {
    headers: { Accept: "application/json" },
    credentials: "include",
  })
  if (!allRes.ok) {
    const body = await allRes.text().catch(() => "")
    throw new Error(`Failed fallback fetch (/policies) HTTP ${allRes.status}${body ? ` – ${body}` : ""}`)
  }
  const allPayload: PoliciesResponse = await allRes.json()
  const all: BackendPolicy[] = Array.isArray(allPayload?.data) ? allPayload.data : []
  return all.filter((p) => (p.insuranceCompanyRef?.split("/")[1] ?? "") === companyId)
}

// ----------------- Page -----------------
export default function PoliciesPage() {
  const navigate = useNavigate()
  const [policies, setPolicies] = useState<BackendPolicy[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // UI state
  const [activeTab, setActiveTab] = useState<"history" | "compare">("history")
  const [comparePair, setComparePair] = useState<{ current: BackendPolicy; previous: BackendPolicy } | null>(null)
  const [compareError, setCompareError] = useState<string | null>(null)

  // Load all policies then keep only latest version per (company + name)
  useEffect(() => {
    let cancelled = false
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 8000)

    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`${API_BASE}/api/v1/policies`, {
          signal: ctrl.signal,
          headers: { Accept: "application/json" },
          credentials: "include",
        })
        if (!res.ok) {
          const body = await res.text().catch(() => "")
          throw new Error(`HTTP ${res.status}${body ? ` – ${body}` : ""}`)
        }
        const payload: PoliciesResponse = await res.json()
        const all: BackendPolicy[] = Array.isArray(payload?.data) ? payload.data : []

        // Keep only latest version for each (companyRef + name)
        const latestMap = new Map<string, BackendPolicy>()
        for (const p of all) {
          const key = `${p.insuranceCompanyRef ?? ""}::${p.name ?? p.id}`
          const prev = latestMap.get(key)
          if (!prev || (p.version ?? 0) > (prev.version ?? 0)) {
            latestMap.set(key, p)
          }
        }
        const latest = Array.from(latestMap.values())

        if (!cancelled) setPolicies(latest)
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load policies")
      } finally {
        clearTimeout(t)
        if (!cancelled) setLoading(false)
      }
    })()

    return () => { cancelled = true; ctrl.abort(); clearTimeout(t) }
  }, [])

  // Open current policy PDF
  const openPolicyPdf = (policyId: string) => {
    window.open(`${API_BASE}/api/v1/policies/${policyId}/pdf`, "_blank", "noopener,noreferrer")
  }

  // Compare with previous: tries company endpoint, falls back to global list
  const handleCompareWithPrevious = async (current: BackendPolicy) => {
    setCompareError(null)
    setComparePair(null)
    setActiveTab("compare")

    try {
      const companyId = current.insuranceCompanyRef?.split("/")[1]
      if (!companyId) throw new Error("Missing insurance company reference.")

      const allForCompany = await fetchCompanyPoliciesWithFallback(companyId)

      // Previous version of the SAME policy name (strict match), lower version, highest among them
      const candidates = allForCompany.filter(
        (p) => p.name === current.name && p.version < current.version
      )
      if (candidates.length === 0) {
        setCompareError("No previous version found for this policy.")
        return
      }
      const previous = candidates.reduce((a, b) => (a.version > b.version ? a : b))

      setComparePair({ current, previous })
    } catch (e: any) {
      setCompareError(e?.message ?? "Could not prepare comparison.")
    }
  }

  return (
    <RoleBasedLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Policy Management</h1>
            <p className="text-muted-foreground mt-2">View and compare the latest policy versions.</p>
          </div>

          {/* New Policy (v1) CTA */}
          <div className="flex items-center gap-2">
            <Button onClick={() => navigate("/hospital/policies/new")}>
              <Plus className="h-4 w-4 mr-2" />
              New Policy
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-4">
          <TabsList>
            <TabsTrigger value="history">Policies</TabsTrigger>
            <TabsTrigger value="compare">Compare</TabsTrigger>
          </TabsList>

          {/* ---------- Policies (latest only) ---------- */}
          <TabsContent value="history" className="space-y-4">
            {loading && (
              <Card>
                <CardHeader>
                  <CardTitle>Loading policies…</CardTitle>
                  <CardDescription>Please wait while we fetch data from the API.</CardDescription>
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

            {!loading && !error && policies.length === 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>No policies</CardTitle>
                  <CardDescription>The API returned an empty list.</CardDescription>
                </CardHeader>
              </Card>
            )}

            {policies.map((policy) => {
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
                          <span className="ml-2 text-sm text-muted-foreground">v{policy.version}</span>
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
                        <Badge variant="secondary">{coverageEntries.length} coverage items</Badge>

                        <Button variant="outline" size="sm" onClick={() => openPolicyPdf(policy.id)}>
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Open PDF
                        </Button>

                        {/* Update Policy = create a new version prefilled from this one */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/hospital/policies/${policy.id}/new-version`)}
                          title="Create a new version of this policy"
                        >
                          Update Policy
                        </Button>

                        <Button variant="default" size="sm" onClick={() => handleCompareWithPrevious(policy)}>
                          Compare with previous
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent>
                    {sumText && <p className="text-sm text-muted-foreground mb-3">{sumText}</p>}

                    <div className="space-y-2">
                      <h4 className="font-medium text-foreground flex items-center">
                        <History className="h-4 w-4 mr-2" />
                        Coverage
                      </h4>
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {coverageEntries.map(([drug, rule]) => (
                          <div key={drug} className="text-sm p-2 rounded-md bg-muted/60 border border-border/40">
                            {humanCoverage(drug, rule)}
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </TabsContent>

          {/* ---------- Compare (current vs previous) ---------- */}
          <TabsContent value="compare" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Compare className="h-5 w-5 mr-2 text-primary" />
                  Compare Versions
                </CardTitle>
                <CardDescription>
                  Use “Compare with previous” from the Policies tab to load a policy alongside its previous version.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {compareError && (
                  <div className="text-sm text-destructive">{compareError}</div>
                )}

                {!comparePair && !compareError && (
                  <div className="text-sm text-muted-foreground">
                    No comparison loaded yet.
                  </div>
                )}

                {comparePair && (
                  <>
                    <CoverageDiff base={comparePair.previous} target={comparePair.current} />
                    <PdfSideBySide current={comparePair.current} previous={comparePair.previous} />
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </RoleBasedLayout>
  )
}

// ---------- Coverage diff (previous vs current) ----------
function CoverageDiff({ base, target }: { base: BackendPolicy; target: BackendPolicy }) {
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
          Comparing <span className="font-medium">v{base.version}</span> → <span className="font-medium">v{target.version}</span> of <span className="font-medium">{target.name}</span>
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
function PdfSideBySide({ current, previous }: { current: BackendPolicy; previous: BackendPolicy }) {
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
            <span className="font-medium">{previous.name}</span> &nbsp;•&nbsp; v{previous.version} (Previous)
          </div>
          <iframe ref={leftRef} title="Previous PDF" src={leftUrl ?? ""} className="w-full h-[75vh] bg-white" />
        </div>

        <div className="border rounded-md overflow-hidden bg-muted/30">
          <div className="px-3 py-2 border-b text-sm">
            <span className="font-medium">{current.name}</span> &nbsp;•&nbsp; v{current.version} (Current)
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
