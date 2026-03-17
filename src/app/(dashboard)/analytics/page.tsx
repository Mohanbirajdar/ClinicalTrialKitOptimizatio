"use client";
import { useEffect, useState } from "react";
import { Topbar } from "@/components/layout/topbar";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { WastageChart } from "@/components/dashboard/wastage-chart";
import { SiteUsageTable } from "@/components/dashboard/site-usage-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardSummary } from "@/types";

export default function AnalyticsPage() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000); // 20s client-side timeout

    fetch("/api/analytics/dashboard", { signal: controller.signal })
      .then((r) => r.json())
      .then((j) => { setData(j.data); setLoading(false); })
      .catch(() => setLoading(false))
      .finally(() => clearTimeout(timeout));

    return () => { controller.abort(); clearTimeout(timeout); };
  }, []);

  if (loading) {
    return (
      <div>
        <Topbar title="Analytics" />
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-28 w-full" />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-80" />
            <Skeleton className="h-80" />
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div>
        <Topbar title="Analytics" />
        <div className="p-6 text-muted-foreground">Failed to load analytics data.</div>
      </div>
    );
  }

  // Wastage rate per month
  const wastageRateData = data.monthly_wastage.map((m) => ({
    month: m.month,
    "Wastage %":
      m.shipped > 0 ? Math.round((m.wasted / m.shipped) * 1000) / 10 : 0,
  }));

  // Pie chart data
  const inStock = Math.max(
    0,
    data.total_shipped - data.total_used - data.total_wasted
  );
  const pieData = [
    { name: "Used", value: data.total_used, color: "#22c55e" },
    { name: "Wasted", value: data.total_wasted, color: "#ef4444" },
    { name: "In Transit / Stock", value: inStock, color: "#6366f1" },
  ].filter((d) => d.value > 0);

  return (
    <div>
      <Topbar title="Analytics" />
      <div className="p-6 space-y-6">
        {/* KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard
            title="Total Kits Shipped"
            value={data.total_shipped.toLocaleString()}
            icon="package"
          />
          <KpiCard
            title="Total Kits Used"
            value={data.total_used.toLocaleString()}
            icon="check-circle"
            variant="success"
          />
          <KpiCard
            title="Total Kits Wasted"
            value={data.total_wasted.toLocaleString()}
            icon="trash-2"
            variant="danger"
          />
          <KpiCard
            title="Overall Wastage Rate"
            value={`${data.wastage_pct}%`}
            icon="percent"
            variant={
              data.wastage_pct > 15
                ? "danger"
                : data.wastage_pct > 8
                ? "warning"
                : "success"
            }
            subtitle={`Target: < 8%`}
          />
        </div>

        {/* Trial & Site Counts */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Active Trials", value: data.active_trials, color: "bg-blue-50 border-blue-200 text-blue-700" },
            { label: "Active Sites", value: data.active_sites, color: "bg-green-50 border-green-200 text-green-700" },
            { label: "Kits Expiring ≤ 30d", value: data.kits_expiring_30, color: "bg-red-50 border-red-200 text-red-700" },
            { label: "Kits Expiring ≤ 60d", value: data.kits_expiring_60, color: "bg-amber-50 border-amber-200 text-amber-700" },
          ].map((item) => (
            <div key={item.label} className={`border rounded-lg p-3 ${item.color}`}>
              <p className="text-xs font-medium">{item.label}</p>
              <p className="text-2xl font-bold">{item.value}</p>
            </div>
          ))}
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <WastageChart data={data.monthly_wastage} />

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Monthly Wastage Rate (%)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={wastageRateData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} unit="%" />
                  <Tooltip formatter={(v) => [`${v}%`, "Wastage Rate"]} />
                  <Bar dataKey="Wastage %" radius={[4, 4, 0, 0]}>
                    {wastageRateData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={
                          entry["Wastage %"] > 20
                            ? "#ef4444"
                            : entry["Wastage %"] > 10
                            ? "#f97316"
                            : "#22c55e"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <SiteUsageTable sites={data.site_usage} />
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Kit Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {pieData.length === 0 ? (
                <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
                  No data yet
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        outerRadius={75}
                        dataKey="value"
                        label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {pieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v, name) => [v, name]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2 mt-2">
                    {pieData.map((d) => (
                      <div key={d.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full" style={{ background: d.color }} />
                          <span>{d.name}</span>
                        </div>
                        <span className="font-medium">{d.value.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Expiry Buckets Summary */}
        {data.expiry_buckets.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Expiry Risk Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                {data.expiry_buckets.map((b) => (
                  <div
                    key={b.range}
                    className={`rounded-lg border p-4 ${
                      b.range === "Expired"
                        ? "bg-red-50 border-red-200"
                        : b.range === "< 30 days"
                        ? "bg-orange-50 border-orange-200"
                        : "bg-amber-50 border-amber-200"
                    }`}
                  >
                    <p className="text-sm font-medium text-muted-foreground">{b.range}</p>
                    <p className="text-2xl font-bold mt-1">{b.quantity}</p>
                    <p className="text-xs text-muted-foreground">units across {b.count} lots</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
