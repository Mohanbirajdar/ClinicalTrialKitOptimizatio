export const revalidate = 30;
import { Topbar } from "@/components/layout/topbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, ClipboardList } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { getAllUsage } from "@/lib/data";

export default async function UsagePage() {
  let usage: Awaited<ReturnType<typeof getAllUsage>> = [];
  try { usage = await getAllUsage(); } catch (e) { console.error("[UsagePage]", e); }
  const totalUsed = usage.reduce((a, u) => a + u.kits_used, 0);
  const totalWasted = usage.reduce((a, u) => a + (u.kits_wasted ?? 0), 0);
  const totalReturned = usage.reduce((a, u) => a + (u.kits_returned ?? 0), 0);

  return (
    <div>
      <Topbar title="Kit Usage" />
      <div className="p-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-700 font-medium">Total Used</p>
            <p className="text-3xl font-bold text-green-800">{totalUsed.toLocaleString()}</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-700 font-medium">Total Returned</p>
            <p className="text-3xl font-bold text-blue-800">{totalReturned.toLocaleString()}</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-700 font-medium">Total Wasted</p>
            <p className="text-3xl font-bold text-red-800">{totalWasted.toLocaleString()}</p>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">Usage Records</h2>
            <p className="text-sm text-muted-foreground">{usage.length} records logged</p>
          </div>
          <Link href="/usage/new">
            <Button><Plus className="h-4 w-4" /> Log Usage</Button>
          </Link>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Site</TableHead>
                  <TableHead>Kit Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Used</TableHead>
                  <TableHead className="text-right">Returned</TableHead>
                  <TableHead className="text-right">Wasted</TableHead>
                  <TableHead>Patients</TableHead>
                  <TableHead>Reported By</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usage.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12">
                      <ClipboardList className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                      <p className="text-muted-foreground">No usage records yet.</p>
                      <Link href="/usage/new">
                        <Button variant="outline" size="sm" className="mt-3">Log First Usage</Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ) : (
                  usage.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <p className="font-medium text-sm">{(u as any).site?.site_name || "—"}</p>
                        <p className="text-xs text-muted-foreground">{(u as any).site?.location || ""}</p>
                      </TableCell>
                      <TableCell className="text-sm">{(u as any).kit?.kit_type || "—"}</TableCell>
                      <TableCell className="text-sm">{formatDate(u.usage_date)}</TableCell>
                      <TableCell className="text-right font-bold text-green-700">{u.kits_used}</TableCell>
                      <TableCell className="text-right text-blue-600">{u.kits_returned}</TableCell>
                      <TableCell className="text-right">
                        <span className={(u.kits_wasted ?? 0) > 0 ? "text-red-600 font-bold" : "text-muted-foreground"}>
                          {u.kits_wasted}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">{u.patient_count ?? "—"}</TableCell>
                      <TableCell className="text-sm">{u.reported_by || "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                        {u.notes || "—"}
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
