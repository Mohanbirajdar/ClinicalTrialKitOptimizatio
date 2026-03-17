export const revalidate = 30;
import { Topbar } from "@/components/layout/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, MapPin, Plus } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { getTrialById } from "@/lib/data";

export default async function TrialDetailPage({ params }: { params: { id: string } }) {
  let trial: Awaited<ReturnType<typeof getTrialById>> = undefined;
  try { trial = await getTrialById(params.id); } catch (e) { console.error("[TrialDetail]", e); }
  if (!trial) return <div className="p-6 text-muted-foreground">Trial not found or failed to load.</div>;

  return (
    <div>
      <Topbar title={trial.trial_name} />
      <div className="p-6 space-y-6">
        <Link href="/trials" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Trials
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="md:col-span-2">
            <CardHeader><CardTitle>Trial Details</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-muted-foreground">Phase</p><Badge className="mt-1">{trial.trial_phase}</Badge></div>
              <div><p className="text-muted-foreground">Status</p><Badge variant={trial.status === "active" ? "success" : "secondary"} className="mt-1">{trial.status}</Badge></div>
              <div><p className="text-muted-foreground">Sponsor</p><p className="font-medium">{trial.sponsor || "—"}</p></div>
              <div><p className="text-muted-foreground">Protocol #</p><p className="font-medium">{trial.protocol_number || "—"}</p></div>
              <div><p className="text-muted-foreground">Start Date</p><p className="font-medium">{formatDate(trial.start_date)}</p></div>
              <div><p className="text-muted-foreground">End Date</p><p className="font-medium">{formatDate(trial.end_date)}</p></div>
              {trial.description && (
                <div className="col-span-2"><p className="text-muted-foreground">Description</p><p className="mt-1">{trial.description}</p></div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Total Sites</span><span className="font-bold text-2xl">{trial.sites?.length || 0}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Active Sites</span><span className="font-medium">{trial.sites?.filter(s => s.status === "active").length || 0}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Total Capacity</span><span className="font-medium">{trial.sites?.reduce((a, s) => a + s.patient_capacity, 0) || 0}</span></div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Sites</CardTitle>
            <Link href={`/sites/new?trial_id=${trial.id}`}>
              <Button size="sm"><Plus className="h-4 w-4" /> Add Site</Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Site Name</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Enrolled</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Activation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(trial.sites || []).length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">No sites registered yet.</TableCell></TableRow>
                ) : (
                  trial.sites.map(site => (
                    <TableRow key={site.id}>
                      <TableCell>
                        <Link href={`/sites/${site.id}`} className="font-medium hover:underline flex items-center gap-1">
                          <MapPin className="h-3 w-3" />{site.site_name}
                        </Link>
                      </TableCell>
                      <TableCell>{site.location}, {site.country}</TableCell>
                      <TableCell><Badge variant={site.status === "active" ? "success" : "secondary"}>{site.status}</Badge></TableCell>
                      <TableCell>{site.enrolled_patients}</TableCell>
                      <TableCell>{site.patient_capacity}</TableCell>
                      <TableCell>{formatDate(site.activation_date)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
