"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CreditCard, Download, Eye, DollarSign, Shield, CheckCircle, AlertCircle
} from "lucide-react";
import { mockPatientBills, mockPatientTreatmentPlan } from "@/lib/mock-patient-data";
import type { PatientBill } from "@/types/patient";
import { RoleBasedLayout } from "@/components/layout/role-based-layout";

const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/+$/, "") ?? "";

// ---------------- Types that match YOUR API exactly ----------------
type Detail =
  | { med: string; type: "percent"; percent: number; points: number }
  | { med: string; type: "not_covered"; points: number }
  | { med: string; type: "covered"; points: number }; // just in case

type PolicySummary = {
  id: string;
  name: string;
  insuranceCompanyRef: string;
  version: number;
  beFileName?: string;
  covered: number;
  partial: number;
  notCovered: number;
  score: number;
  details: Detail[];
  coveredRatio: number;
  deltaScore?: number;
  pctImprovement?: number;
};

type RecommendationsResponse = {
  userId: string;
  medications: string[];
  minImprovement: number;
  resolvedCurrentPolicyId: string;
  current: PolicySummary;
  count: number;
  betterOptions: PolicySummary[];
};

// ---------------- Helper utils ----------------
const fmtMoney = (n: number) => `$${(Math.round(n * 100) / 100).toLocaleString()}`;
const extractDateFromFile = (name?: string) => {
  if (!name) return null;
  const m = name.match(/\b(20\d{2}-\d{2}-\d{2})\b/); // e.g., 2025-11-15
  return m?.[1] ?? null;
};
//const userId = user?.id ?? "unknown"

// async function handleSwitchPlan(policyId: string) {
//   if (!user?.id) {
//     alert("You must be signed in to switch plans.")
//     return
//   }
//   try {
//     const res = await fetch(`${API_BASE}/api/v1/auth/updateUser/${userId}`, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({
//         insuredAt: "policies/"+policyId,
//       }),
//     })

//     if (!res.ok) {
//       throw new Error(await res.text())
//     }

//     alert("Your insurance plan has been switched!")
//   } catch (e: any) {
//     alert(`Failed to switch: ${e.message}`)
//   }
// }



function computeCoverageRatioFromDetails(opt: PolicySummary): number {
  if (Array.isArray(opt.details) && opt.details.length > 0) {
    const total = opt.details.reduce((sum, d) => {
      if (d.type === "covered") return sum + 1;
      if (d.type === "percent") return sum + d.percent / 100;
      return sum; // not_covered = 0
    }, 0);
    return total / opt.details.length;
  }
  return typeof opt.coveredRatio === "number" ? opt.coveredRatio : 0;
}


const medLabel = (d: Detail) =>
  d.type === "percent" ? `${d.med} • ${d.percent}%` : d.type === "covered" ? `${d.med} • 100%` : `${d.med} • Not covered`;

// ---------------- Component ----------------
export default function PatientBillingPage() {
  const [bills] = useState<PatientBill[]>(mockPatientBills);

  // ---- Recommendations fetch (YOUR endpoint/shape) ----
  const { user } = useAuth();
  const userId = user?.id ?? "unknown";

  const [data, setData] = useState<RecommendationsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!userId || userId === "unknown") return;
    const ac = new AbortController();
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch(`${API_BASE}/api/v1/recommendations/${encodeURIComponent(userId)}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          signal: ac.signal,
        });
        if (!res.ok) throw new Error(await res.text().catch(() => `HTTP ${res.status}`));
        const json: RecommendationsResponse = await res.json();
        // optional: sort better options by score desc (or deltaScore desc)
        json.betterOptions = [...(json.betterOptions ?? [])].sort(
          (a, b) => (b.deltaScore ?? b.score) - (a.deltaScore ?? a.score)
        );
        setData(json);
      } catch (e: any) {
        if (e?.name !== "AbortError") setErr(e?.message || "Failed to load recommendations");
      } finally {
        setLoading(false);
      }
    })();
    return () => ac.abort();
  }, [userId]);

  // ---------------- Totals & coverage math ----------------
  // Raw totals from bills
  const totalBilled = useMemo(() => bills.reduce((s, b) => s + b.totalAmount, 0), [bills]);
  const rawCovered  = useMemo(() => bills.reduce((s, b) => s + b.coveredAmount, 0), [bills]);
  


  // Average coverage score from the current policy (0..1). Default to 1 if unknown.
  const avgCoverageScore = data?.current?.score ?? 1;
  const totalOwed = totalBilled - totalBilled*avgCoverageScore;

  // Adjusted covered dollars and percent of the billed total
  const adjustedCovered = useMemo(() => rawCovered * avgCoverageScore, [rawCovered, avgCoverageScore]);
  const adjustedCoveredPct = useMemo(
    () => (totalBilled > 0 ? Math.round((adjustedCovered / totalBilled) * 100) : 0),
    [adjustedCovered, totalBilled]
  );

  // current out-of-pocket proxy (you can replace with your real value)
  const currentAnnualOOP = useMemo(() => bills.reduce((s, b) => s + b.patientAmount, 0), [bills]);

  return (
    <RoleBasedLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Bills &amp; Coverage</h1>
          <p className="text-muted-foreground mt-2">View your medical bills and insurance coverage details.</p>
        </div>

        {/* Coverage Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Billed</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{fmtMoney(totalBilled)}</div>
              <p className="text-xs text-muted-foreground">All medical services</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Insurance Covered</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{fmtMoney(adjustedCovered)}</div>
              <p className="text-xs text-muted-foreground">
                {adjustedCoveredPct}% of {fmtMoney(totalBilled)} covered
                {avgCoverageScore !== 1 && " (plan score applied)"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Amount Owed</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{fmtMoney(totalOwed)}</div>
              <p className="text-xs text-muted-foreground">Outstanding balance</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="bills" className="space-y-4">
          <TabsList>
            <TabsTrigger value="bills">Coverage Details</TabsTrigger>
            <TabsTrigger value="recommendations" disabled={!userId || userId === "unknown"}>
              Recommendations
            </TabsTrigger>
          </TabsList>

          {/* ---- Medical Bills tab (with current plan at top) ---- */}
          <TabsContent value="bills" className="space-y-4">
            {/* Current Insurance Plan (from recommendations) */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="h-5 w-5 mr-2 text-primary" />
                  Current Insurance Plan
                </CardTitle>
                <CardDescription>This is the plan applied to your medical bills.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {!userId ? (
                  <p className="text-sm text-muted-foreground">Sign in to view your current plan.</p>
                ) : loading ? (
                  <p className="text-sm text-muted-foreground">Loading current plan…</p>
                ) : err ? (
                  <p className="text-sm text-red-600">Failed to load: {err}</p>
                ) : !data?.current ? (
                  <p className="text-sm text-muted-foreground">No current policy found.</p>
                ) : (
                  <>
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">{data.current.name}</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          <Badge variant="secondary">Covered: {data.current.covered}</Badge>
                          <Badge variant="secondary">Partial: {data.current.partial}</Badge>
                          <Badge variant="destructive">Not covered: {data.current.notCovered}</Badge>
                          <Badge variant="outline">
                            Coverage: {Math.round((data.current.coveredRatio ?? 0) * 100)}%
                          </Badge>
                        </div>
                      </div>
                      {data.current.beFileName && (
                        <Button variant="outline" size="sm" asChild>
                          {/* Change href to your real file route if different */}
                          <a href={`/files/${encodeURIComponent(data.current.beFileName)}`} target="_blank" rel="noreferrer">
                            View Policy PDF
                          </a>
                        </Button>
                      )}
                    </div>

                    {Array.isArray(data.current.details) && data.current.details.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm text-muted-foreground mb-1">Medication coverage:</p>
                        <div className="flex flex-wrap gap-2">
                          {data.current.details.map((d, i) => {
                            const label =
                              d.type === "percent"
                                ? `${d.med} • ${d.percent}%`
                                : d.type === "covered"
                                ? `${d.med} • 100%`
                                : `${d.med} • Not covered`;
                            return (
                              <Badge key={i} variant={d.type === "not_covered" ? "destructive" : "default"}>
                                {label}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Your bills list can go here if needed */}
          </TabsContent>

          {/* ---- Recommendations (only betterOptions) ---- */}
          <TabsContent value="recommendations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Better Insurance Options</CardTitle>
                <CardDescription>
                  Plans that provide improved coverage compared to your current policy.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {loading && <p className="text-sm text-muted-foreground">Loading recommendations…</p>}
                {err && <p className="text-sm text-red-600">Failed to load: {err}</p>}
                {!loading && !err && data && data.betterOptions.length === 0 && (
                  <p className="text-sm text-muted-foreground">No better options found.</p>
                )}

                {!loading && !err && data && data.betterOptions.length > 0 && (
                  <div className="space-y-3">
                    {data.betterOptions.map((opt) => {
                      const effective = extractDateFromFile(opt.beFileName);
                      return (
                        <div
                          key={opt.id}
                          className="p-4 border border-border rounded-lg bg-muted/40 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                        >
                          <div>
                            <p className="font-medium text-foreground">
                              {opt.name} <span className="text-muted-foreground">• v{opt.version}</span>
                            </p>
                            <div className="flex flex-wrap gap-2 mt-1">
                              <Badge variant="secondary">Covered: {opt.covered}</Badge>
                              <Badge variant="secondary">Partial: {opt.partial}</Badge>
                              <Badge variant="destructive">Not covered: {opt.notCovered}</Badge>
                              <Badge variant="outline">
                                Coverage: {Math.round(computeCoverageRatioFromDetails(opt) * 100)}%
                              </Badge>

                            </div>

                            {opt.details?.length > 0 && (
                              <div className="mt-2">
                                <p className="text-sm text-muted-foreground mb-1">Medication coverage:</p>
                                <div className="flex flex-wrap gap-2">
                                  {opt.details.map((d, i) => (
                                    <Badge key={i} variant={d.type === "not_covered" ? "destructive" : "default"}>
                                      {medLabel(d)}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            <p className="text-xs text-muted-foreground mt-2">
                              {opt.beFileName ? `Policy file: ${opt.beFileName}` : "No file attached"}
                              {effective && ` • Effective ${effective}`}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            {opt.beFileName && (
                              <Button variant="outline" size="sm" asChild>
                      <a href={`https://firebasestorage.googleapis.com/v0/b/policy-pulse-7cf5e.firebasestorage.app/o/${encodeURIComponent(opt.beFileName)}?alt=media`} target="_blank" rel="noreferrer">
                        View PDF
                      </a>
                    </Button>
                            )}
                            <Button size="sm" onClick={() => handleSwitchPlan(opt.id)}>Switch Plan</Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </RoleBasedLayout>
  );
}
