export const revalidate = 30;
import { Topbar } from "@/components/layout/topbar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle } from "lucide-react";
import { formatDate, getExpiryStatus } from "@/lib/utils";
import { getExpiringKits } from "@/lib/data";

const emptyExpiring: Awaited<ReturnType<typeof getExpiringKits>> = { kits: [], grouped: { expired: [], within_30: [], within_60: [] }, total: 0 };

export default async function ExpiringKitsPage() {
  let data = emptyExpiring;
  try { data = await getExpiringKits(60); } catch (e) { console.error("[ExpiringKitsPage]", e); }
  const { grouped } = data;

  return (
    <div>
      <Topbar title="Expiring Kits" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-3 gap-4">
          {[
            { title: "Expired", kits: grouped.expired, color: "border-red-300 bg-red-50" },
            { title: "Expiring within 30 days", kits: grouped.within_30, color: "border-orange-300 bg-orange-50" },
            { title: "Expiring in 30-60 days", kits: grouped.within_60, color: "border-amber-300 bg-amber-50" },
          ].map(({ title, kits, color }) => (
            <Card key={title} className={`border-2 ${color}`}>
              <CardHeader className="pb-2"><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{kits.length}</p>
                <p className="text-sm text-muted-foreground mt-1">{kits.reduce((a: number, k: any) => a + k.quantity, 0)} units at risk</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {[
          { title: "Expired Kits", kits: grouped.expired, variant: "destructive" as const },
          { title: "Expiring within 30 days", kits: grouped.within_30, variant: "destructive" as const },
          { title: "Expiring in 30-60 days", kits: grouped.within_60, variant: "warning" as const },
        ].map(({ title, kits, variant }) => kits.length > 0 && (
          <Card key={title}>
            <CardHeader className="pb-2 flex flex-row items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <CardTitle className="text-base">{title} ({kits.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kit Type</TableHead>
                    <TableHead>Lot Number</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Expiry Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(kits as any[]).map((kit: any) => {
                    const expiry = getExpiryStatus(kit.expiry_date);
                    return (
                      <TableRow key={kit.id}>
                        <TableCell className="font-medium">{kit.kit_type}</TableCell>
                        <TableCell className="font-mono text-sm">{kit.lot_number}</TableCell>
                        <TableCell className="font-bold text-red-600">{kit.quantity}</TableCell>
                        <TableCell>{formatDate(kit.expiry_date)}</TableCell>
                        <TableCell><Badge variant={expiry.variant}>{expiry.label}</Badge></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
