export const dynamic = "force-dynamic";
import { Topbar } from "@/components/layout/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Brain } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { getSiteById } from "@/lib/data";

export default async function SiteDetailPage({ params }: { params: { id: string } }) {
  let site: Awaited<ReturnType<typeof getSiteById>> = undefined;
  try { site = await getSiteById(params.id); } catch (e) { console.error("[SiteDetail]", e); }
  if (!site) return <div className="p-6 text-muted-foreground">Site not found or failed to load.</div>;

  const enrollmentPct = Math.round((site.enrolled_patients / site.patient_capacity) * 100);

  return (
    <div>
      <Topbar title={site.site_name} />
      <div className="p-6 space-y-6">
        <Link href="/sites" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Sites
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="md:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Site Details</CardTitle>
              <Badge variant={site.status === "active" ? "success" : "secondary"}>{site.status}</Badge>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-muted-foreground">Trial</p><p className="font-medium">{(site as any).trial?.trial_name || "—"}</p></div>
              <div><p className="text-muted-foreground">Location</p><p className="font-medium">{site.location}, {site.country}</p></div>
              <div><p className="text-muted-foreground">Activation Date</p><p className="font-medium">{formatDate(site.activation_date)}</p></div>
              <div><p className="text-muted-foreground">Samples / Patient</p><p className="font-medium">{site.samples_per_patient}</p></div>
              <div><p className="text-muted-foreground">Coordinator</p><p className="font-medium">{site.coordinator_name || "—"}</p></div>
              <div><p className="text-muted-foreground">Email</p><p className="font-medium">{site.coordinator_email || "—"}</p></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Enrollment</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <p className="text-4xl font-bold">{enrollmentPct}%</p>
                <p className="text-sm text-muted-foreground mt-1">Enrollment Rate</p>
              </div>
              <div className="w-full h-3 bg-gray-200 rounded-full">
                <div className="h-3 bg-primary rounded-full transition-all" style={{ width: `${enrollmentPct}%` }} />
              </div>
              <div className="flex justify-between text-sm">
                <span><span className="font-bold">{site.enrolled_patients}</span> enrolled</span>
                <span><span className="font-bold">{site.patient_capacity}</span> capacity</span>
              </div>
              <div className="pt-2 border-t text-sm">
                <p className="text-muted-foreground">Estimated Kit Demand</p>
                <p className="text-2xl font-bold text-primary">{site.enrolled_patients * site.samples_per_patient}</p>
                <p className="text-xs text-muted-foreground">{site.enrolled_patients} patients × {site.samples_per_patient} samples</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Demand Forecast</CardTitle>
            <form action={`/api/sites/${params.id}/forecast`} method="POST">
              <Link href={`/sites/${params.id}/forecast`}>
                <Button size="sm"><Brain className="h-4 w-4" /> Run Forecast</Button>
              </Link>
            </form>
          </CardHeader>
          <CardContent>
            {((site as any).forecasts || []).length === 0 ? (
              <p className="text-muted-foreground text-sm">No forecasts yet. Click "Run Forecast" to generate a demand prediction.</p>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {((site as any).forecasts as any[]).slice(0, 3).map((f: any) => (
                  <Card key={f.id} className="bg-blue-50 border-blue-200">
                    <CardContent className="p-4 text-sm">
                      <p className="text-muted-foreground">Predicted Demand</p>
                      <p className="text-2xl font-bold text-blue-700">{f.predicted_demand}</p>
                      <p className="text-xs mt-1">+ {f.safety_stock} safety stock</p>
                      <p className="text-xs font-semibold text-blue-600">= {f.recommended_qty} recommended</p>
                      <p className="text-xs text-muted-foreground mt-2">{formatDate(f.forecast_date)}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
