"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Topbar } from "@/components/layout/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Truck, Package, MapPin } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { Shipment } from "@/types";

const statusColors: Record<
  string,
  "default" | "success" | "warning" | "destructive" | "secondary" | "outline"
> = {
  preparing: "secondary",
  shipped: "warning",
  in_transit: "default",
  delivered: "success",
  cancelled: "destructive",
};

const statusFlow = ["preparing", "shipped", "in_transit", "delivered"];

export default function ShipmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [actualDelivery, setActualDelivery] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");

  useEffect(() => {
    fetch(`/api/shipments/${params.id}`)
      .then((r) => r.json())
      .then((j) => {
        setShipment(j.data);
        setNewStatus(j.data?.status || "");
        setTrackingNumber(j.data?.tracking_number || "");
        setLoading(false);
      });
  }, [params.id]);

  const handleStatusUpdate = async () => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/shipments/${params.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          actual_delivery_date: actualDelivery || null,
          tracking_number: trackingNumber || null,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || "Failed");
      setShipment(json.data);
      toast({ title: "Shipment status updated" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setUpdating(false);
    }
  };

  if (loading)
    return (
      <div>
        <Topbar title="Shipment Detail" />
        <div className="p-6 text-muted-foreground">Loading...</div>
      </div>
    );
  if (!shipment)
    return (
      <div>
        <Topbar title="Shipment Detail" />
        <div className="p-6">Shipment not found.</div>
      </div>
    );

  const currentStepIndex = statusFlow.indexOf(shipment.status);

  return (
    <div>
      <Topbar title="Shipment Detail" />
      <div className="p-6 space-y-6 max-w-4xl">
        <Link
          href="/shipments"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Shipments
        </Link>

        {/* Status Timeline */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle>Shipment Tracking</CardTitle>
            <Badge variant={statusColors[shipment.status ?? "preparing"] || "secondary"}>
              {(shipment.status ?? "preparing").replace("_", " ")}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-0 mb-6">
              {statusFlow.map((step, i) => (
                <div key={step} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                        i <= currentStepIndex
                          ? "bg-primary text-white border-primary"
                          : "bg-white text-muted-foreground border-gray-300"
                      }`}
                    >
                      {i + 1}
                    </div>
                    <p className="text-xs mt-1 text-center capitalize w-16">
                      {step.replace("_", " ")}
                    </p>
                  </div>
                  {i < statusFlow.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mb-4 ${
                        i < currentStepIndex ? "bg-primary" : "bg-gray-200"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Shipment Info */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Truck className="h-4 w-4" /> Shipment Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipment Date</span>
                <span className="font-medium">{formatDate(shipment.shipment_date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Expected Delivery</span>
                <span className="font-medium">
                  {formatDate(shipment.expected_delivery_date)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Actual Delivery</span>
                <span className="font-medium">
                  {formatDate(shipment.actual_delivery_date)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tracking #</span>
                <span className="font-mono text-xs">
                  {shipment.tracking_number || "—"}
                </span>
              </div>
              {shipment.notes && (
                <div>
                  <p className="text-muted-foreground">Notes</p>
                  <p className="mt-1">{shipment.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Kit & Site Info */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4" /> Kit & Destination
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Kit Type</span>
                <span className="font-medium">
                  {(shipment as any).kit?.kit_type || "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Lot Number</span>
                <span className="font-mono text-xs">
                  {(shipment as any).kit?.lot_number || "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Quantity Shipped</span>
                <span className="font-bold text-lg">{shipment.quantity}</span>
              </div>
              <div className="border-t pt-3">
                <div className="flex items-center gap-1 text-muted-foreground mb-1">
                  <MapPin className="h-3 w-3" /> Destination
                </div>
                <p className="font-medium">
                  {(shipment as any).site?.site_name || "—"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {(shipment as any).site?.location || ""}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Update Status */}
        {shipment.status !== "delivered" && shipment.status !== "cancelled" && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Update Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label>New Status</Label>
                  <Select
                    value={newStatus}
                    onValueChange={setNewStatus}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["preparing", "shipped", "in_transit", "delivered", "cancelled"].map(
                        (s) => (
                          <SelectItem key={s} value={s}>
                            {s.replace("_", " ")}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Tracking Number</Label>
                  <Input
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="FED123..."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Actual Delivery Date</Label>
                  <Input
                    type="date"
                    value={actualDelivery}
                    onChange={(e) => setActualDelivery(e.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={handleStatusUpdate}
                    disabled={updating}
                    className="w-full"
                  >
                    {updating ? "Updating..." : "Update"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
