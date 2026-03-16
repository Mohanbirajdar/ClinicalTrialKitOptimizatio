export const dynamic = "force-dynamic";
import { db } from "@/db";
import { trials, sites, kits, shipments, kitUsage, alerts } from "@/db/schema";
import { sql, eq, and, lt, gt, desc, gte } from "drizzle-orm";
import { successResponse, serverError } from "@/lib/api-response";
import { addDays, subMonths, format } from "date-fns";

export async function GET() {
  try {
    const today = new Date();

    // Totals
    const [totals] = await db.select({
      total_shipped: sql<number>`SUM(quantity)`,
    }).from(shipments).where(sql`status != 'cancelled'`);

    const [usageTotals] = await db.select({
      total_used: sql<number>`COALESCE(SUM(kits_used), 0)`,
      total_wasted: sql<number>`COALESCE(SUM(kits_wasted), 0)`,
    }).from(kitUsage);

    const total_shipped = Number(totals?.total_shipped || 0);
    const total_used = Number(usageTotals?.total_used || 0);
    const total_wasted = Number(usageTotals?.total_wasted || 0);
    const wastage_pct = total_shipped > 0 ? Math.round((total_wasted / total_shipped) * 1000) / 10 : 0;

    // Monthly wastage (last 6 months)
    const monthly_wastage = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(today, i);
      const monthStr = format(monthDate, "yyyy-MM");
      const monthLabel = format(monthDate, "MMM");

      const [monthShipped] = await db.select({
        total: sql<number>`COALESCE(SUM(quantity), 0)`,
      }).from(shipments).where(sql`DATE_FORMAT(shipment_date,'%Y-%m') = ${monthStr} AND status != 'cancelled'`);

      const [monthUsage] = await db.select({
        used: sql<number>`COALESCE(SUM(kits_used), 0)`,
        wasted: sql<number>`COALESCE(SUM(kits_wasted), 0)`,
      }).from(kitUsage).where(sql`DATE_FORMAT(usage_date,'%Y-%m') = ${monthStr}`);

      monthly_wastage.push({
        month: monthLabel,
        shipped: Number(monthShipped?.total || 0),
        used: Number(monthUsage?.used || 0),
        wasted: Number(monthUsage?.wasted || 0),
      });
    }

    // Expiry buckets
    const today_str = today.toISOString().split("T")[0];
    const d30 = addDays(today, 30).toISOString().split("T")[0];
    const d60 = addDays(today, 60).toISOString().split("T")[0];

    const [exp30] = await db.select({ count: sql<number>`COUNT(*)`, qty: sql<number>`COALESCE(SUM(quantity),0)` })
      .from(kits).where(and(lt(kits.expiry_date, d30), gte(kits.expiry_date, today_str), gt(kits.quantity, 0)));
    const [exp60] = await db.select({ count: sql<number>`COUNT(*)`, qty: sql<number>`COALESCE(SUM(quantity),0)` })
      .from(kits).where(and(lt(kits.expiry_date, d60), gte(kits.expiry_date, d30), gt(kits.quantity, 0)));
    const [expired] = await db.select({ count: sql<number>`COUNT(*)`, qty: sql<number>`COALESCE(SUM(quantity),0)` })
      .from(kits).where(and(lt(kits.expiry_date, today_str), gt(kits.quantity, 0)));

    const expiry_buckets = [
      { range: "Expired", count: Number(expired?.count || 0), quantity: Number(expired?.qty || 0) },
      { range: "< 30 days", count: Number(exp30?.count || 0), quantity: Number(exp30?.qty || 0) },
      { range: "30-60 days", count: Number(exp60?.count || 0), quantity: Number(exp60?.qty || 0) },
    ];

    // Site usage
    const siteUsageRows = await db.select({
      site_id: kitUsage.site_id,
      kits_used: sql<number>`COALESCE(SUM(kits_used), 0)`,
      kits_wasted: sql<number>`COALESCE(SUM(kits_wasted), 0)`,
    }).from(kitUsage).groupBy(kitUsage.site_id);

    const siteShipRows = await db.select({
      site_id: shipments.site_id,
      kits_shipped: sql<number>`COALESCE(SUM(quantity), 0)`,
    }).from(shipments).where(sql`status != 'cancelled'`).groupBy(shipments.site_id);

    const allSites = await db.select().from(sites).limit(10);

    const site_usage = allSites.map((s) => {
      const usage = siteUsageRows.find((r) => r.site_id === s.id);
      const shipped = siteShipRows.find((r) => r.site_id === s.id);
      const ks = Number(shipped?.kits_shipped || 0);
      const ku = Number(usage?.kits_used || 0);
      const kw = Number(usage?.kits_wasted || 0);
      return {
        site_id: s.id,
        site_name: s.site_name,
        location: s.location,
        kits_shipped: ks,
        kits_used: ku,
        kits_wasted: kw,
        wastage_pct: ks > 0 ? Math.round((kw / ks) * 1000) / 10 : 0,
      };
    });

    // Counts
    const [activeTrials] = await db.select({ count: sql<number>`COUNT(*)` }).from(trials).where(eq(trials.status, "active"));
    const [activeSites] = await db.select({ count: sql<number>`COUNT(*)` }).from(sites).where(eq(sites.status, "active"));

    // Recent alerts
    const recent_alerts = await db.select().from(alerts).where(eq(alerts.is_resolved, false)).orderBy(desc(alerts.created_at)).limit(5);

    return successResponse({
      total_shipped,
      total_used,
      total_wasted,
      wastage_pct,
      shipped_trend: 5,
      used_trend: 3,
      wastage_trend: -2,
      wastage_pct_trend: -1.5,
      monthly_wastage,
      expiry_buckets,
      site_usage,
      recent_alerts,
      active_trials: Number(activeTrials?.count || 0),
      active_sites: Number(activeSites?.count || 0),
      kits_expiring_30: Number(exp30?.count || 0),
      kits_expiring_60: Number(exp60?.count || 0),
    });
  } catch (e) {
    return serverError(e);
  }
}
