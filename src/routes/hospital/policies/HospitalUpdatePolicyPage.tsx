import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { RoleBasedLayout } from "@/components/layout/role-based-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FileText, Info } from "lucide-react"

const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/+$/, "") ?? ""

// Coverage type aligned to your schema (no copay here)
type CoverageEntry =
  | { type: "covered" }
  | { type: "percent"; percent: number }
  | { type: "not_covered" }

type Policy = {
  id: string
  name: string
  summary?: string
  beFileName?: string
  effectiveDate: string | null
  version: number
  coverage_map: Record<string, CoverageEntry>
  insuranceCompanyRef?: string // "insurance_companies/{id}"
}

type InsuranceCompany = { id: string; name: string }

export default function PolicyNewVersionPage() {
  const { policyId } = useParams()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [policy, setPolicy] = useState<Policy | null>(null)

  // New version inputs
  const [effectiveDate, setEffectiveDate] = useState<string>("")
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Companies dropdown
  const [companies, setCompanies] = useState<InsuranceCompany[]>([])
  const [companiesLoading, setCompaniesLoading] = useState(true)
  const [companiesError, setCompaniesError] = useState<string | null>(null)
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("")

  // Load current policy
  useEffect(() => {
    if (!policyId) return
    let cancelled = false
    ;(async () => {
      setLoading(true); setError(null)
      try {
        const res = await fetch(`${API_BASE}/api/v1/policies/${policyId}`, {
          headers: { Accept: "application/json" },
          credentials: "include",
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const payload = await res.json()
        const p: Policy | null = payload?.data ?? null
        if (!cancelled) {
          setPolicy(p)
          setEffectiveDate(p?.effectiveDate ?? "")
          // pre-select company from policy.insuranceCompanyRef
          const ref = p?.insuranceCompanyRef ?? ""
          const idFromRef = ref.startsWith("insurance_companies/") ? ref.split("/")[1] : ""
          setSelectedCompanyId(idFromRef)
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load policy")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [policyId])

  // Load companies for dropdown
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setCompaniesLoading(true); setCompaniesError(null)
      try {
        // Uses underscore variant, per your backend sample
        const res = await fetch(`${API_BASE}/api/v1/insurance_companies`, {
          headers: { Accept: "application/json" },
          credentials: "include",
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const payload = await res.json()
        const list: InsuranceCompany[] = Array.isArray(payload?.data) ? payload.data : []
        if (!cancelled) {
          setCompanies(list)
          if (!selectedCompanyId && list[0]) setSelectedCompanyId(list[0].id)
        }
      } catch (e: any) {
        if (!cancelled) setCompaniesError(e?.message ?? "Failed to load companies")
      } finally {
        if (!cancelled) setCompaniesLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, []) // once

  function stripCoverageMap(m: Record<string, CoverageEntry>) {
    // ensure entries match zod schema shape (no copay)
    const out: Record<string, CoverageEntry> = {}
    for (const [k, v] of Object.entries(m ?? {})) {
      if (v.type === "percent") out[k] = { type: "percent", percent: Number((v as any).percent ?? 0) }
      else if (v.type === "covered") out[k] = { type: "covered" }
      else out[k] = { type: "not_covered" }
    }
    return out
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      if (!policy) throw new Error("Missing policy")
      if (!file) throw new Error("Please upload the new PDF file")

      setSubmitting(true)

      // Build form to match PoliciesCreateSchema (+ file)
      // Summary is NOT included; backend will auto-generate it from the PDF.
      const form = new FormData()
      form.append("name", policy.name)
      form.append("insuranceCompanyRef", `insurance_companies/${selectedCompanyId}`)
      form.append("beFileName", file.name)
      if (effectiveDate) form.append("effectiveDate", effectiveDate) // ISO (yyyy-mm-dd)
      form.append("version", String(policy.version + 1)) // increment
      form.append("coverage_map", JSON.stringify(stripCoverageMap(policy.coverage_map ?? {})))
      form.append("file", file)

      const res = await fetch(`${API_BASE}/api/v1/policies/upload`, {
        method: "POST",
        body: form,
        credentials: "include",
      })
      if (!res.ok) {
        const body = await res.text().catch(() => "")
        throw new Error(`Failed to create new version (HTTP ${res.status}) ${body}`)
      }

      // Optional: you mentioned /api/v1/policies/summary/:id for manual summary.
      // Assuming backend auto-summarizes on upload, we don’t call it here.

      navigate("/hospital/policies")
    } catch (err: any) {
      alert(err?.message ?? "Failed to submit new version")
    } finally {
      setSubmitting(false)
    }
  }

  const fmtDate = (iso: string | null | undefined) => {
    if (!iso) return "—"
    try { return new Date(iso).toLocaleDateString() } catch { return iso ?? "—" }
  }

  const canSubmit = !!file && !submitting && !!selectedCompanyId

  return (
    <RoleBasedLayout>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">Update Policy (New Version)</h1>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => navigate(-1)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {submitting ? "Saving…" : "Create New Version"}
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Current Policy</CardTitle>
            <CardDescription>The new file will be saved as the next version of this policy.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
            {error && <p className="text-sm text-destructive">{error}</p>}

            {policy && (
              <>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs uppercase text-muted-foreground">Policy Name</Label>
                    <div className="text-sm font-medium">{policy.name}</div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs uppercase text-muted-foreground">Current Version</Label>
                    <div className="text-sm font-medium">v{policy.version}</div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs uppercase text-muted-foreground">Current Effective Date</Label>
                    <div className="text-sm font-medium">{fmtDate(policy.effectiveDate)}</div>
                  </div>
                </div>

                {policy.beFileName && (
                  <div className="inline-flex items-center text-muted-foreground">
                    <FileText className="h-4 w-4 mr-2" />
                    {policy.beFileName}
                  </div>
                )}


                {/* Info */}
                <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/40 rounded-md p-3">
                  <Info className="h-4 w-4 mt-0.5" />
                  <div>
                    <div className="font-medium">What’s required?</div>
                    Upload a new PDF (required). Effective date is optional.
                    The backend will auto-generate the summary and the version will be saved as <span className="font-semibold">v{(policy.version ?? 0) + 1}</span>.
                  </div>
                </div>

                {/* Editable inputs for the new version */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>New Effective Date (optional)</Label>
                    <Input
                      type="date"
                      value={effectiveDate ?? ""}
                      onChange={(e) => setEffectiveDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>New Policy PDF (required)</Label>
                  <Input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    required
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate(-1)} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={!canSubmit}>
            {submitting ? "Saving…" : "Create New Version"}
          </Button>
        </div>
      </form>
    </RoleBasedLayout>
  )
}
