// src/pages/PolicyCreatePage.tsx
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { RoleBasedLayout } from "@/components/layout/role-based-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Info, Loader2 } from "lucide-react"

const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/+$/, "") ?? ""

// Payload types sent to the backend
type CoverageEntry =
  | { type: "covered" }
  | { type: "percent"; percent: number } // (no copay in payload per server schema)
  | { type: "not_covered" }

type InsuranceCompany = { id: string; name: string }

export default function PolicyCreatePage() {
  const navigate = useNavigate()

  // ---- Insurance company state ----
  const [companies, setCompanies] = useState<InsuranceCompany[]>([])
  const [loadingCompanies, setLoadingCompanies] = useState(true)
  const [companyError, setCompanyError] = useState<string | null>(null)
  const [companyChoice, setCompanyChoice] = useState<"existing" | "new">("existing")
  const [existingCompanyId, setExistingCompanyId] = useState<string>("")
  const [newCompanyName, setNewCompanyName] = useState<string>("")

  // ---- Form state ----
  const [name, setName] = useState("")
  const [effectiveDate, setEffectiveDate] = useState<string>("") // yyyy-mm-dd (optional)
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // (Optional) coverage_map editor scaffolding;
  // If you add UI later, buildCoverageMap() already ignores empty keys.
  type Row = { key: string; type: "covered" | "percent" | "not_covered"; percent?: number }
  const [rows, setRows] = useState<Row[]>([])

  // Load insurers
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoadingCompanies(true)
      setCompanyError(null)
      try {
        const res = await fetch(`${API_BASE}/api/v1/insurance_companies`, {
          headers: { Accept: "application/json" },
          credentials: "include",
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const payload = await res.json()
        const list: InsuranceCompany[] = Array.isArray(payload?.data) ? payload.data : []
        if (!cancelled) {
          setCompanies(list)
          if (list[0]) setExistingCompanyId(list[0].id)
        }
      } catch (e: any) {
        if (!cancelled) setCompanyError(e?.message ?? "Failed to load companies")
      } finally {
        if (!cancelled) setLoadingCompanies(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  // Ensure company (either pick existing or create new)
  async function ensureCompanyId(): Promise<string> {
    if (companyChoice === "existing") {
      if (!existingCompanyId) throw new Error("Please select a company")
      return existingCompanyId
    }
    if (!newCompanyName.trim()) throw new Error("Please enter the new company name")
    const res = await fetch(`${API_BASE}/api/v1/insurance_companies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name: newCompanyName.trim() }),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => "")
      throw new Error(`Failed to create company (HTTP ${res.status}) ${body}`)
    }
    const payload = await res.json()
    const createdId = payload?.data?.id
    if (!createdId) throw new Error("Company created but no id returned")
    return createdId
  }

  // Only include non-empty coverage items; ensures backend doesn’t see empty arrays/keys.
  function buildCoverageMap(): Record<string, CoverageEntry> {
    const m: Record<string, CoverageEntry> = {}
    for (const r of rows) {
      const k = r.key.trim()
      if (!k) continue
      if (r.type === "covered") m[k] = { type: "covered" }
      else if (r.type === "not_covered") m[k] = { type: "not_covered" }
      else {
        const pct = Number(r.percent ?? 0)
        const percent = Number.isFinite(pct) ? Math.max(0, Math.min(100, pct)) : 0
        m[k] = { type: "percent", percent }
      }
    }
    return m
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return
    try {
      if (!name.trim()) throw new Error("Name is required")
      if (!file) throw new Error("Please attach a PDF")

      setSubmitting(true)

      const companyId = await ensureCompanyId()

      // Multipart form to /policies/upload
      const form = new FormData()
      form.append("name", name.trim())
      form.append("insuranceCompanyRef", `insurance_companies/${companyId}`)
      if (effectiveDate) form.append("effectiveDate", effectiveDate) // optional ISO yyyy-mm-dd
      form.append("version", "1")
      form.append("coverage_map", JSON.stringify(buildCoverageMap()))
      form.append("beFileName", file.name) // required by schema
      form.append("file", file)

      const res = await fetch(`${API_BASE}/api/v1/policies/upload`, {
        method: "POST",
        body: form,
        credentials: "include",
      })
      if (!res.ok) {
        const body = await res.text().catch(() => "")
        throw new Error(`Failed to create policy (HTTP ${res.status}) ${body}`)
      }

      // Navigate back to policies (replace history so back won’t return to form)
      navigate("/hospital/policies", { replace: true })
    } catch (err: any) {
      alert(err?.message ?? "Failed to submit")
    } finally {
      setSubmitting(false)
    }
  }

  const canSubmit =
    !!name.trim() &&
    !!file &&
    (companyChoice === "new" ? !!newCompanyName.trim() : !!existingCompanyId) &&
    !submitting

  return (
    <RoleBasedLayout>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">New Policy</h1>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => navigate(-1)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {submitting ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating…</>) : "Create Policy"}
            </Button>
          </div>
        </div>

        {/* Insurance company */}
        <Card>
          <CardHeader>
            <CardTitle>Insurance Company</CardTitle>
            <CardDescription>Pick an existing company or create a new one.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4 flex-wrap">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="companyChoice"
                  value="existing"
                  checked={companyChoice === "existing"}
                  onChange={() => setCompanyChoice("existing")}
                  disabled={submitting}
                />
                <span>Use existing</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="companyChoice"
                  value="new"
                  checked={companyChoice === "new"}
                  onChange={() => setCompanyChoice("new")}
                  disabled={submitting}
                />
                <span>Create new</span>
              </label>
            </div>

            {companyChoice === "existing" ? (
              <div className="space-y-2">
                <Label>Company</Label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  disabled={loadingCompanies || !!companyError || submitting}
                  value={existingCompanyId}
                  onChange={(e) => setExistingCompanyId(e.target.value)}
                >
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {companyError && <p className="text-sm text-destructive">{companyError}</p>}
              </div>
            ) : (
              <div className="space-y-2">
                <Label>New company name</Label>
                <Input
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  placeholder="e.g., Evergreen Mutual"
                  required
                  disabled={submitting}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Policy details */}
        <Card>
          <CardHeader>
            <CardTitle>Policy Details</CardTitle>
            <CardDescription>Basic information and the PDF file.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required disabled={submitting} />
              </div>
              <div className="space-y-2">
                <Label>Effective Date (optional)</Label>
                <Input
                  type="date"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/40 rounded-md p-3">
              <Info className="h-4 w-4 mt-0.5" />
              <div>
                <div className="font-medium">Summary is auto-generated</div>
                After you upload the PDF, the summary will be created automatically.
              </div>
            </div>

            <div className="space-y-2">
              <Label>Policy PDF</Label>
              <Input
                type="file"
                accept="application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                required
                disabled={submitting}
              />
            </div>

            {/* (Optional) If you later add a UI for coverage rows, keep using buildCoverageMap() */}
          </CardContent>
        </Card>

        {/* Footer buttons */}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate(-1)} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={!canSubmit}>
            {submitting ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating…</>) : "Create Policy"}
          </Button>
        </div>
      </form>
    </RoleBasedLayout>
  )
}
