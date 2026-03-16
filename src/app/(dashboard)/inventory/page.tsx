import { Topbar } from "@/components/layout/topbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, AlertTriangle, Package } from "lucide-react";
import Link from "next/link";
import { formatDate, formatCurrency, getExpiryStatus } from "@/lib/utils";
import { getAllKits } from "@/lib/data";

const statusColors: Record<string, "default" | "success" | "warning" | "destructive" | "secondary"> = {
  available: "success",
  low_stock: "warning",
  expired: "destructive",
  depleted: "secondary",
};

export default async function InventoryPage() {
  const kits = await getAllKits();
  const totalUnits = kits.reduce((a, k) => a + k.quantity, 0);
  const expiringCount = kits.filter(k => {
    const days = Math.floor((new Date(k.expiry_date).getTime() - Date.now()) / 86400000);
    return days <= 30 && days >= 0;
  }).length;

  return (
    <div>
      <Topbar title="Kit Inventory" />
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold">Specimen Kit Inventory</h2>
            <p className="text-sm text-muted-foreground">{kits.length} lots · {totalUnits.toLocaleString()} total units</p>
          </div>
          <div className="flex gap-2">
            <Link href="/inventory/expiring">
              <Button variant="outline" className="text-amber-600 border-amber-300">
                <AlertTriangle className="h-4 w-4" /> Expiring ({expiringCount})
              </Button>
            </Link>
            <Link href="/inventory/new">
              <Button><Plus className="h-4 w-4" /> Add Kit Lot</Button>
            </Link>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kit Type</TableHead>
                  <TableHead>Lot Number</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Mfg Date</TableHead>
                  <TableHead>Expiry Date</TableHead>
                  <TableHead>Days Left</TableHead>
                  <TableHead>Unit Cost</TableHead>
                  <TableHead>Storage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kits.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12">
                      <Package className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                      <p className="text-muted-foreground">No kits in inventory. Add your first kit lot.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  kits.map(kit => {
                    const expiry = getExpiryStatus(kit.expiry_date);
                    return (
                      <TableRow key={kit.id} className={expiry.urgent ? "bg-red-50/50" : ""}>
                        <TableCell className="font-medium">{kit.kit_type}</TableCell>
                        <TableCell className="font-mono text-sm">{kit.lot_number}</TableCell>
                        <TableCell>
                          <span className={kit.quantity < 10 ? "text-red-600 font-bold" : ""}>{kit.quantity}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusColors[kit.status ?? "available"] || "secondary"}>{(kit.status ?? "available").replace("_", " ")}</Badge>
                        </TableCell>
                        <TableCell>{formatDate(kit.manufacturing_date)}</TableCell>
                        <TableCell>{formatDate(kit.expiry_date)}</TableCell>
                        <TableCell>
                          <Badge variant={expiry.variant}>{expiry.label}</Badge>
                        </TableCell>
                        <TableCell>{formatCurrency(kit.unit_cost)}</TableCell>
                        <TableCell className="text-sm">{kit.storage_requirements || "—"}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
