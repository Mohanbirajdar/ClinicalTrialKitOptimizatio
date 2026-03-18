export const dynamic = "force-dynamic";
import dynamic from "next/dynamic";
import { Topbar } from "@/components/layout/topbar";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { AlertFeed } from "@/components/dashboard/alert-feed";
import { SiteUsageTable } from "@/components/dashboard/site-usage-table";
import { getDashboardSummary } from "@/lib/data";

// Recharts uses browser APIs - disable SSR to prevent PathnameContext crash
const WastageChart = dynamic(
  () => import("@/components/dashboard/wastage-chart").then(m => ({ default: m.WastageChart })),
  { ssr: false, loading: () => <div className="h-64 bg-muted animate-pulse rounded-lg" /> }
);
const ExpiryHeatmap = dynamic(
  () => import("@/components/dashboard/expiry-heatmap").then(m => ({ default: m.ExpiryHeatmap })),
  { ssr: false, loading: () => <div className="h-64 bg-muted animate-pulse rounded-lg" /> }
);

const emptyData: Awaited<ReturnType<typeof getDashboardSummary>> = {
  total_shipped: 0, total_used: 0, total_wasted: 0, wastage_pct: 0,
  shipped_trend: 0, used_trend: 0, wastage_trend: 0, wastage_pct_trend: 0,
  monthly_wastage: [], expiry_buckets: [], site_usage: [], recent_alerts: [],
  active_trials: 0, active_sites: 0, kits_expiring_30: 0, kits_expiring_60: 0,
};

export default async function DashboardPage() {
  let data = emptyData;
  try {
    data = await getDashboardSummary();
  } catch (e) {
    console.error("[Dashboard] getDashboardSummary failed:", e);
  }

  return (
    <div>
      <Topbar title="Dashboard" />
      <div className="p-6 space-y-6">
        {/* Summary Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="col-span-2 md:col-span-4 flex gap-4 text-sm text-muted-foreground">
            <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-medium">
              {data.active_trials} Active Trials
            </span>
            <span className="bg-green-50 text-green-700 px-3 py-1 rounded-full font-medium">
              {data.active_sites} Active Sites
            </span>
            <span className="bg-orange-50 text-orange-700 px-3 py-1 rounded-full font-medium">
              {data.kits_expiring_30} Kits Expiring in 30 Days
            </span>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard
            title="Total Kits Shipped"
            value={data.total_shipped.toLocaleString()}
            trend={data.shipped_trend}
            icon="package"
          />
          <KpiCard
            title="Kits Used"
            value={data.total_used.toLocaleString()}
            trend={data.used_trend}
            icon="check-circle"
            variant="success"
          />
          <KpiCard
            title="Kits Wasted"
            value={data.total_wasted.toLocaleString()}
            trend={data.wastage_trend}
            icon="trash-2"
            variant="danger"
          />
          <KpiCard
            title="Wastage Rate"
            value={`${data.wastage_pct}%`}
            trend={data.wastage_pct_trend}
            icon="percent"
            variant={data.wastage_pct > 15 ? "danger" : data.wastage_pct > 8 ? "warning" : "success"}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <WastageChart data={data.monthly_wastage} />
          <ExpiryHeatmap data={data.expiry_buckets} />
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="col-span-2">
            <SiteUsageTable sites={data.site_usage} />
          </div>
          <AlertFeed alerts={data.recent_alerts} />
        </div>
      </div>
    </div>
  );
}
