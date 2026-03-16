"use client";
import { useEffect, useState, useCallback } from "react";
import { Topbar } from "@/components/layout/topbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle,
  RefreshCw,
  Bell,
} from "lucide-react";
import type { Alert } from "@/types";
import { formatDateTime } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const severityConfig = {
  critical: {
    icon: AlertCircle,
    color: "text-red-500",
    badge: "destructive" as const,
    row: "bg-red-50/40",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-amber-500",
    badge: "warning" as const,
    row: "bg-amber-50/30",
  },
  info: {
    icon: Info,
    color: "text-blue-500",
    badge: "secondary" as const,
    row: "",
  },
};

const alertTypeLabels: Record<string, string> = {
  expiry_warning: "Expiry Warning",
  low_stock: "Low Stock",
  overstock: "Overstock",
  shipment_delayed: "Shipment Delayed",
  high_wastage: "High Wastage",
};

export default function AlertsPage() {
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"active" | "all">("active");
  const [scanning, setScanning] = useState(false);
  const [resolving, setResolving] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const resolved = filter === "active" ? "false" : "";
      const url = resolved !== "" ? `/api/alerts?resolved=${resolved}` : "/api/alerts";
      const res = await fetch(url);
      const json = await res.json();
      setAlerts(json.data || []);
    } catch {
      toast({ title: "Failed to load alerts", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const runScan = async () => {
    setScanning(true);
    try {
      const res = await fetch("/api/alerts/check", { method: "POST" });
      const json = await res.json();
      const count = json.data?.generated || 0;
      toast({
        title: "Alert scan complete",
        description:
          count > 0
            ? `Generated ${count} new alert${count > 1 ? "s" : ""}.`
            : "No new alerts detected.",
      });
      fetchAlerts();
    } catch {
      toast({ title: "Scan failed", variant: "destructive" });
    } finally {
      setScanning(false);
    }
  };

  const resolve = async (id: string) => {
    setResolving(id);
    try {
      const res = await fetch(`/api/alerts/${id}/resolve`, { method: "PATCH" });
      const json = await res.json();
      if (!json.success) throw new Error("Failed");
      setAlerts((prev) => prev.filter((a) => a.id !== id));
      toast({ title: "Alert resolved" });
    } catch {
      toast({ title: "Failed to resolve alert", variant: "destructive" });
    } finally {
      setResolving(null);
    }
  };

  const critical = alerts.filter((a) => a.severity === "critical" && !a.is_resolved).length;
  const warning = alerts.filter((a) => a.severity === "warning" && !a.is_resolved).length;

  return (
    <div>
      <Topbar title="Alert Center" />
      <div className="p-6">
        {/* Header bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex gap-1">
              <Button
                size="sm"
                variant={filter === "active" ? "default" : "outline"}
                onClick={() => setFilter("active")}
              >
                Active
              </Button>
              <Button
                size="sm"
                variant={filter === "all" ? "default" : "outline"}
                onClick={() => setFilter("all")}
              >
                All
              </Button>
            </div>
            {critical > 0 && (
              <Badge variant="destructive" className="gap-1">
                <AlertCircle className="h-3 w-3" />
                {critical} Critical
              </Badge>
            )}
            {warning > 0 && (
              <Badge variant="warning" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                {warning} Warning
              </Badge>
            )}
          </div>

          <Button
            variant="outline"
            onClick={runScan}
            disabled={scanning}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${scanning ? "animate-spin" : ""}`} />
            {scanning ? "Scanning..." : "Run Alert Scan"}
          </Button>
        </div>

        {/* Alert Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>Type</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Loading alerts...
                    </TableCell>
                  </TableRow>
                ) : alerts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-14">
                      <Bell className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-muted-foreground font-medium">
                        No {filter === "active" ? "active" : ""} alerts
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Run an alert scan to check for new issues.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-4"
                        onClick={runScan}
                        disabled={scanning}
                      >
                        <RefreshCw className={`h-4 w-4 ${scanning ? "animate-spin" : ""}`} />
                        Run Scan Now
                      </Button>
                    </TableCell>
                  </TableRow>
                ) : (
                  alerts.map((alert) => {
                    const config =
                      severityConfig[alert.severity ?? "info"] || severityConfig.info;
                    const Icon = config.icon;
                    return (
                      <TableRow
                        key={alert.id}
                        className={alert.is_resolved ? "opacity-60" : config.row}
                      >
                        <TableCell>
                          <Icon className={`h-4 w-4 ${config.color}`} />
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs font-normal">
                            {alertTypeLabels[alert.alert_type ?? "low_stock"] || alert.alert_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={config.badge}>{alert.severity}</Badge>
                        </TableCell>
                        <TableCell className="max-w-sm">
                          <p className="text-sm leading-snug">{alert.message}</p>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground capitalize">
                          {alert.entity_type || "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDateTime(alert.created_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          {alert.is_resolved ? (
                            <span className="text-xs text-green-600 flex items-center justify-end gap-1">
                              <CheckCircle className="h-3.5 w-3.5" /> Resolved
                            </span>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => resolve(alert.id)}
                              disabled={resolving === alert.id}
                              className="gap-1 text-xs"
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                              {resolving === alert.id ? "..." : "Resolve"}
                            </Button>
                          )}
                        </TableCell>
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
