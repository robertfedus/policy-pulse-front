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
  version: number | string // backend may return string; we coerce
  coverage_map: Record<string, CoverageEntry>
  insuranceCompanyRef?: string // "insurance_companies/{id}"
}

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
        const p: Policy | null =
          (Array.isArray(payload?.data) ? payload.data[0] : payload?.data) ?? null
        if (!cancelled) {
          setPolicy(p)
          setEffectiveDate(p?.effectiveDate ?? "")
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load policy")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [policyId])

  function nextVersion(v: number | string | undefined | null) {
    return (Number(v) || 0) + 1
  }

  function normalizeCoverageMap(m: Record<string, CoverageEntry>) {
    // ensure entries match server schema (no copay)
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

      const newVersion = nextVersion(policy.version)

      // Build form to CREATE a new record (new id) as the next version.
      // Do NOT send `id`. Keep same name + insuranceCompanyRef, bump version.
      const form = new FormData()
      form.append("name", policy.name)
      if (policy.insuranceCompanyRef) {
        form.append("insuranceCompanyRef", policy.insuranceCompanyRef)
      }
      if (effectiveDate) form.append("effectiveDate", effectiveDate) // ISO yyyy-mm-dd (optional)
      form.append("version", String(newVersion))                     // numeric increment -> "2"
      form.append("coverage_map", JSON.stringify(normalizeCoverageMap(policy.coverage_map ?? {})))
      form.append("beFileName", file.name)                           // filename for storage
      form.append("file", file)                                      // the new PDF

      // Same upload route — backend creates a NEW policy row (new id) for this version
      const res = await fetch(`${API_BASE}/api/v1/policies/upload`, {
        method: "POST",
        body: form,
        credentials: "include",
      })
      if (!res.ok) {
        const body = await res.text().catch(() => "")
        throw new Error(`Failed to upload new version (HTTP ${res.status}) ${body}`)
      }

      // Navigate back to Policies list (replace to avoid resubmits)
      navigate("/hospital/policies", { replace: true })
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

  const canSubmit = !!file && !submitting
  const currentVersion = Number(policy?.version) || 0
  const newVersionPreview = currentVersion + 1

  return (
    <RoleBasedLayout>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">Create New Version</h1>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => navigate(-1)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {submitting ? "Saving…" : `Save v${newVersionPreview}`}
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Current Policy</CardTitle>
            <CardDescription>
              Upload a new PDF. This will create a <b>new policy record (new id)</b> as <b>v{newVersionPreview}</b>,
              linked by the same <code>name</code> and <code>insuranceCompanyRef</code>.
            </CardDescription>
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
                    <div className="text-sm font-medium">v{currentVersion}</div>
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
                    The backend will auto-generate the summary. We <b>do not</b> send <code>id</code>,
                    so a new record (new id) is created as version <span className="font-semibold">v{newVersionPreview}</span>.
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
            {submitting ? "Saving…" : `Save v${newVersionPreview}`}
          </Button>
        </div>
      </form>
    </RoleBasedLayout>
  )
}
