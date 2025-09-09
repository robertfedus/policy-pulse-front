// src/pages/PolicyCreatePage.tsx
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { RoleBasedLayout } from "@/components/layout/role-based-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, Info } from "lucide-react"

const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/+$/, "") ?? ""

type CoverageEntry =
  | { type: "covered" }
  | { type: "percent"; percent: number } // no copay in payload per server schema
  | { type: "not_covered" }

type InsuranceCompany = { id: string; name: string }

export default function PolicyCreatePage() {
  const navigate = useNavigate()

  // Insurer
  const [companies, setCompanies] = useState<InsuranceCompany[]>([])
  const [loadingCompanies, setLoadingCompanies] = useState(true)
  const [companyError, setCompanyError] = useState<string | null>(null)
  const [companyChoice, setCompanyChoice] = useState<"existing" | "new">("existing")
  const [existingCompanyId, setExistingCompanyId] = useState<string>("")
  const [newCompanyName, setNewCompanyName] = useState<string>("")

  // Policy fields (no summary)
  const [name, setName] = useState("")
  const [effectiveDate, setEffectiveDate] = useState<string>("") // yyyy-mm-dd
  const [file, setFile] = useState<File | null>(null)

  // coverage_map editor (simple list)
  type Row = {
    key: string
    type: "covered" | "percent" | "not_covered"
    percent?: number
    copay?: number // UI-only; stripped before submit
  }
  const [rows, setRows] = useState<Row[]>([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoadingCompanies(true)
      setCompanyError(null)
      try {
        // underscore path
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

  const addRow = () => setRows((r) => [...r, { key: "", type: "covered" }])
  const removeRow = (i: number) => setRows((r) => r.filter((_, idx) => idx !== i))
  const updateRow = (i: number, patch: Partial<Row>) =>
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)))

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

  function buildCoverageMap(): Record<string, CoverageEntry> {
    // match server schema (no copay)
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
    try {
      if (!name.trim()) throw new Error("Name is required")
      if (!file) throw new Error("Please attach a PDF")

      const companyId = await ensureCompanyId()

      // Multipart form to /policies/upload
      const form = new FormData()
      form.append("name", name.trim())
      form.append("insuranceCompanyRef", `insurance_companies/${companyId}`)
      if (effectiveDate) form.append("effectiveDate", effectiveDate) // ISO yyyy-mm-dd
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

      navigate("/hospital/policies")
    } catch (err: any) {
      alert(err?.message ?? "Failed to submit")
    }
  }

  const canSubmit =
    !!name.trim() &&
    !!file &&
    (companyChoice === "new" ? !!newCompanyName.trim() : !!existingCompanyId)

  return (
    <RoleBasedLayout>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">New Policy</h1>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              Create Policy
            </Button>
          </div>
        </div>

        {/* Insurer */}
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
                />
                <span>Create new</span>
              </label>
            </div>

            {companyChoice === "existing" ? (
              <div className="space-y-2">
                <Label>Company</Label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  disabled={loadingCompanies || !!companyError}
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
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Policy core (no summary) */}
        <Card>
          <CardHeader>
            <CardTitle>Policy Details</CardTitle>
            <CardDescription>Basic information and the PDF file.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Effective Date (optional)</Label>
                <Input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} />
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
              />
            </div>
          </CardContent>
        </Card>

        {/* Coverage editor */}
        <Card>
          <CardHeader>
            <CardTitle>Coverage Map</CardTitle>
            <CardDescription>Add drugs/benefits and their coverage.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {rows.length === 0 && <p className="text-sm text-muted-foreground">No items yet.</p>}
            <div className="space-y-2">
              {rows.map((r, i) => (
                <div key={i} className="grid md:grid-cols-12 gap-2 items-end border p-3 rounded-md">
                  <div className="md:col-span-4">
                    <Label>Key</Label>
                    <Input
                      value={r.key}
                      onChange={(e) => updateRow(i, { key: e.target.value })}
                      placeholder="e.g., paracetamol 500mg"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <Label>Type</Label>
                    <select
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={r.type}
                      onChange={(e) => updateRow(i, { type: e.target.value as Row["type"] })}
                    >
                      <option value="covered">covered</option>
                      <option value="percent">percent</option>
                      <option value="not_covered">not_covered</option>
                    </select>
                  </div>
                  {r.type === "percent" && (
                    <>
                      <div className="md:col-span-2">
                        <Label>Percent</Label>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={r.percent ?? ""}
                          onChange={(e) =>
                            updateRow(i, { percent: e.target.value === "" ? undefined : Number(e.target.value) })
                          }
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label>Copay (optional)</Label>
                        <Input
                          type="number"
                          min={0}
                          value={r.copay ?? ""}
                          onChange={(e) =>
                            updateRow(i, { copay: e.target.value === "" ? undefined : Number(e.target.value) })
                          }
                        />
                      </div>
                    </>
                  )}
                  <div className="md:col-span-1">
                    <Button type="button" variant="ghost" onClick={() => removeRow(i)} title="Remove">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <Button type="button" variant="outline" onClick={addRow}>
              <Plus className="h-4 w-4 mr-2" /> Add coverage item
            </Button>

            {rows.length > 0 && (
              <div className="pt-2 text-xs text-muted-foreground">
                <Badge variant="secondary">{rows.length}</Badge> items will be saved.
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button type="submit" disabled={!canSubmit}>
            Create Policy
          </Button>
        </div>
      </form>
    </RoleBasedLayout>
  )
}
