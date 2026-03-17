export const dynamic = "force-dynamic";
import { Topbar } from "@/components/layout/topbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Truck } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { getAllShipments } from "@/lib/data";

const statusColors: Record<string, "default" | "success" | "warning" | "destructive" | "secondary" | "outline"> = {
  preparing: "secondary",
  shipped: "warning",
  in_transit: "default",
  delivered: "success",
  cancelled: "destructive",
};

export default async function ShipmentsPage() {
  let shipments: Awaited<ReturnType<typeof getAllShipments>> = [];
  try { shipments = await getAllShipments(); } catch (e) { console.error("[ShipmentsPage]", e); }

  return (
    <div>
      <Topbar title="Shipments" />
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold">Kit Shipments</h2>
            <p className="text-sm text-muted-foreground">{shipments.length} total shipments</p>
          </div>
          <Link href="/shipments/new">
            <Button><Plus className="h-4 w-4" /> New Shipment</Button>
          </Link>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Site</TableHead>
                  <TableHead>Kit Type</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Shipment Date</TableHead>
                  <TableHead>Expected Delivery</TableHead>
                  <TableHead>Tracking</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shipments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12">
                      <Truck className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                      <p className="text-muted-foreground">No shipments yet.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  shipments.map(s => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{(s as any).site?.site_name || "—"}</p>
                          <p className="text-xs text-muted-foreground">{(s as any).site?.location || ""}</p>
                        </div>
                      </TableCell>
                      <TableCell>{(s as any).kit?.kit_type || "—"}</TableCell>
                      <TableCell className="font-medium">{s.quantity}</TableCell>
                      <TableCell><Badge variant={statusColors[s.status ?? "preparing"] || "secondary"}>{(s.status ?? "preparing").replace("_", " ")}</Badge></TableCell>
                      <TableCell>{formatDate(s.shipment_date)}</TableCell>
                      <TableCell>{formatDate(s.expected_delivery_date)}</TableCell>
                      <TableCell className="font-mono text-xs">{s.tracking_number || "—"}</TableCell>
                      <TableCell className="text-right">
                        <Link href={`/shipments/${s.id}`}>
                          <Button variant="ghost" size="sm">View</Button>
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
