export const dynamic = "force-dynamic";
import { Topbar } from "@/components/layout/topbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Eye, MapPin } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { getAllSites } from "@/lib/data";

export default async function SitesPage() {
  let sites: Awaited<ReturnType<typeof getAllSites>> = [];
  try { sites = await getAllSites(); } catch (e) { console.error("[SitesPage]", e); }

  return (
    <div>
      <Topbar title="Research Sites" />
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold">All Sites</h2>
            <p className="text-sm text-muted-foreground">{sites.length} total sites</p>
          </div>
          <Link href="/sites/new">
            <Button><Plus className="h-4 w-4" /> Register Site</Button>
          </Link>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Site</TableHead>
                  <TableHead>Trial</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Enrolled / Capacity</TableHead>
                  <TableHead>Samples/Patient</TableHead>
                  <TableHead>Activation</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sites.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12">
                      <MapPin className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                      <p className="text-muted-foreground">No sites registered yet.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  sites.map(site => (
                    <TableRow key={site.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{site.site_name}</p>
                          <p className="text-xs text-muted-foreground">{site.location}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{(site as any).trial?.trial_name || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={site.status === "active" ? "success" : site.status === "closed" ? "destructive" : "secondary"}>
                          {site.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{site.country}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{site.enrolled_patients} / {site.patient_capacity}</span>
                          <div className="w-16 h-1.5 bg-gray-200 rounded-full">
                            <div
                              className="h-1.5 bg-primary rounded-full"
                              style={{ width: `${Math.min(100, (site.enrolled_patients / site.patient_capacity) * 100)}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{site.samples_per_patient}</TableCell>
                      <TableCell>{formatDate(site.activation_date)}</TableCell>
                      <TableCell className="text-right">
                        <Link href={`/sites/${site.id}`}>
                          <Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button>
                        </Link>
                      </TableCell>
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
