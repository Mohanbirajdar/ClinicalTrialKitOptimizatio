import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, AlertCircle, Info } from "lucide-react";
import type { Alert } from "@/types";
import { formatDateTime } from "@/lib/utils";
import Link from "next/link";

const severityConfig = {
  critical: { icon: AlertCircle, color: "text-red-500", badge: "destructive" as const },
  warning: { icon: AlertTriangle, color: "text-amber-500", badge: "warning" as const },
  info: { icon: Info, color: "text-blue-500", badge: "secondary" as const },
};

export function AlertFeed({ alerts }: { alerts: Alert[] }) {
  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base">Recent Alerts</CardTitle>
        <Link href="/alerts" className="text-xs text-primary hover:underline">View all</Link>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No active alerts</p>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => {
              const config = severityConfig[alert.severity ?? "info"] || severityConfig.info;
              const Icon = config.icon;
              return (
                <div key={alert.id} className="flex gap-3 items-start">
                  <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${config.color}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm leading-snug line-clamp-2">{alert.message}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDateTime(alert.created_at)}
                    </p>
                  </div>
                  <Badge variant={config.badge} className="shrink-0 text-xs">
                    {alert.severity}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
