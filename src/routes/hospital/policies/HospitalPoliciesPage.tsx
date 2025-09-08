import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Shield, History, Compass as Compare, AlertCircle, FileText } from "lucide-react"
import { RoleBasedLayout } from "@/components/layout/role-based-layout"

// --- shared with login style ---
const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/+$/, "") ?? ""

// ----------------- Types mapped to your backend response -----------------
type CoverageEntry =
  | { type: "covered" }
  | { type: "percent"; percent: number; copay?: number }
  | { type: "not_covered" }

export interface BackendPolicy {
  id: string
  name: string
  summary?: string
  beFileName?: string
  effectiveDate: string
  version: number
  coverage_map: Record<string, CoverageEntry>
  createdAt?: { _seconds: number; _nanoseconds: number }
  insuranceCompanyRef?: string
}

interface PoliciesResponse {
  data: BackendPolicy[]
}

// ----------------- Helpers -----------------
const companyNameFromRef = (ref?: string) => {
  if (!ref) return "Unknown Insurer"
  const id = ref.split("/")[1] ?? ref
  return `Insurer ${id.slice(0, 6)}…`
}

const humanCoverage = (k: string, v: CoverageEntry) => {
  switch (v.type) {
    case "covered":
      return `${k}: covered`
    case "not_covered":
      return `${k}: not covered`
    case "percent": {
      const copay = v.copay != null ? ` (copay $${v.copay})` : ""
      return `${k}: ${v.percent}%${copay}`
    }
  }
}

const fmtDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString()
  } catch {
    return iso
  }
}

// ----------------- Component -----------------
export default function PoliciesPage() {
  const [policies, setPolicies] = useState<BackendPolicy[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPolicies, setSelectedPolicies] = useState<string[]>([])

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
          credentials: "include", // 👈 same as login
        })

        if (!res.ok) {
          const body = await res.text().catch(() => "")
          throw new Error(`HTTP ${res.status}${body ? ` – ${body}` : ""}`)
        }

        const payload: PoliciesResponse = await res.json()
        if (!cancelled) setPolicies(Array.isArray(payload?.data) ? payload.data : [])
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load policies")
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
  }, [])

  const togglePolicySelection = (policyId: string) => {
    setSelectedPolicies((prev) =>
      prev.includes(policyId) ? prev.filter((id) => id !== policyId) : [...prev, policyId],
    )
  }

  const selected = useMemo(
    () => selectedPolicies.map((id) => policies.find((p) => p.id === id)).filter(Boolean) as BackendPolicy[],
    [selectedPolicies, policies],
  )

  return (
    <RoleBasedLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Policy Management</h1>
          <p className="text-muted-foreground mt-2">
            View and compare patient insurance policies and their details.
          </p>
        </div>

        <Tabs defaultValue="history" className="space-y-4">
          <TabsList>
            <TabsTrigger value="history">Policies</TabsTrigger>
            <TabsTrigger value="compare">Compare</TabsTrigger>
          </TabsList>

          {/* ---------- History / List ---------- */}
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
              const isSelected = selectedPolicies.includes(policy.id)

              return (
                <Card key={policy.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center">
                          <Shield className="h-5 w-5 mr-2 text-primary" />
                          {policy.name} <span className="ml-2 text-sm text-muted-foreground">v{policy.version}</span>
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
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary">{coverageEntries.length} coverage items</Badge>
                        <Button
                          variant={isSelected ? "default" : "outline"}
                          size="sm"
                          onClick={() => togglePolicySelection(policy.id)}
                        >
                          {isSelected ? "Selected" : "Select"}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent>
                    {policy.summary && (
                      <p className="text-sm text-muted-foreground mb-3">{policy.summary}</p>
                    )}

                    <div className="space-y-2">
                      <h4 className="font-medium text-foreground flex items-center">
                        <History className="h-4 w-4 mr-2" />
                        Coverage
                      </h4>
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {coverageEntries.map(([drug, rule]) => (
                          <div
                            key={drug}
                            className="text-sm p-2 rounded-md bg-muted/60 border border-border/40"
                          >
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

          {/* ---------- Compare ---------- */}
          <TabsContent value="compare" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Compare className="h-5 w-5 mr-2 text-primary" />
                  Policy Comparison
                </CardTitle>
                <CardDescription>
                  Select policies from the Policies tab to compare their fields and coverage.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selected.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No policies selected for comparison.</p>
                  </div>
                ) : selected.length === 1 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Select at least 2 policies to compare.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selected.map((p) => (
                        <Card key={p.id} className="border-2 border-primary">
                          <CardHeader>
                            <CardTitle className="text-lg">{p.name}</CardTitle>
                            <CardDescription>
                              Version v{p.version} • Effective {fmtDate(p.effectiveDate)}
                              <br />
                              {companyNameFromRef(p.insuranceCompanyRef)}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            {p.summary && <p className="text-sm text-muted-foreground">{p.summary}</p>}
                            <div className="text-xs text-muted-foreground">
                              {Object.keys(p.coverage_map || {}).length} coverage items
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    <div>
                      <h4 className="font-medium text-foreground mb-2">Coverage (by policy)</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selected.map((p) => (
                          <Card key={p.id}>
                            <CardHeader>
                              <CardTitle className="text-base">{p.name}</CardTitle>
                              <CardDescription>v{p.version}</CardDescription>
                            </CardHeader>
                            <CardContent className="grid sm:grid-cols-2 gap-2">
                              {Object.entries(p.coverage_map || {}).map(([drug, rule]) => (
                                <div key={drug} className="text-sm p-2 rounded-md bg-muted/60">
                                  {humanCoverage(drug, rule)}
                                </div>
                              ))}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>

                    <Button variant="outline" onClick={() => setSelectedPolicies([])} className="w-full">
                      Clear Selection
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </RoleBasedLayout>
  )
}