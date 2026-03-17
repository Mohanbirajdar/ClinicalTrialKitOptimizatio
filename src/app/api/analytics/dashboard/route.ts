export const dynamic = "force-dynamic";
import { db } from "@/db";
import { trials, sites, kits, shipments, kitUsage, alerts } from "@/db/schema";
import { sql, eq, and, lt, gt, desc, gte } from "drizzle-orm";
import { successResponse, serverError } from "@/lib/api-response";
import { addDays, subMonths, format } from "date-fns";

export async function GET() {
  try {
    const today = new Date();
    const today_str = today.toISOString().split("T")[0];
    const d30 = addDays(today, 30).toISOString().split("T")[0];
    const d60 = addDays(today, 60).toISOString().split("T")[0];
    const d180 = subMonths(today, 6).toISOString().split("T")[0];

    const [
      [totals],
      [usageTotals],
      monthlyShipRows,
      monthlyUsageRows,
      [exp30],
      [exp60],
      [expired],
      allSites,
      siteUsageRows,
      siteShipRows,
      [activeTrials],
      [activeSites],
      recent_alerts,
    ] = await Promise.all([
      db.select({ total_shipped: sql<number>`COALESCE(SUM(quantity), 0)` })
        .from(shipments).where(sql`status != 'cancelled'::shipment_status`),

      db.select({
        total_used: sql<number>`COALESCE(SUM(kits_used), 0)`,
        total_wasted: sql<number>`COALESCE(SUM(kits_wasted), 0)`,
      }).from(kitUsage),

      db.select({
        month: sql<string>`TO_CHAR(shipment_date, 'YYYY-MM')`,
        total: sql<number>`COALESCE(SUM(quantity), 0)`,
      }).from(shipments)
        .where(sql`status != 'cancelled'::shipment_status AND shipment_date >= ${d180}`)
        .groupBy(sql`TO_CHAR(shipment_date, 'YYYY-MM')`),

      db.select({
        month: sql<string>`TO_CHAR(usage_date, 'YYYY-MM')`,
        used: sql<number>`COALESCE(SUM(kits_used), 0)`,
        wasted: sql<number>`COALESCE(SUM(kits_wasted), 0)`,
      }).from(kitUsage)
        .where(sql`usage_date >= ${d180}`)
        .groupBy(sql`TO_CHAR(usage_date, 'YYYY-MM')`),

      db.select({ count: sql<number>`COUNT(*)`, qty: sql<number>`COALESCE(SUM(quantity),0)` })
        .from(kits).where(and(lt(kits.expiry_date, d30), gte(kits.expiry_date, today_str), gt(kits.quantity, 0))),

      db.select({ count: sql<number>`COUNT(*)`, qty: sql<number>`COALESCE(SUM(quantity),0)` })
        .from(kits).where(and(lt(kits.expiry_date, d60), gte(kits.expiry_date, d30), gt(kits.quantity, 0))),

      db.select({ count: sql<number>`COUNT(*)`, qty: sql<number>`COALESCE(SUM(quantity),0)` })
        .from(kits).where(and(lt(kits.expiry_date, today_str), gt(kits.quantity, 0))),

      db.select().from(sites).limit(10),

      db.select({
        site_id: kitUsage.site_id,
        kits_used: sql<number>`COALESCE(SUM(kits_used), 0)`,
        kits_wasted: sql<number>`COALESCE(SUM(kits_wasted), 0)`,
      }).from(kitUsage).groupBy(kitUsage.site_id),

      db.select({
        site_id: shipments.site_id,
        kits_shipped: sql<number>`COALESCE(SUM(quantity), 0)`,
      }).from(shipments).where(sql`status != 'cancelled'::shipment_status`).groupBy(shipments.site_id),

      db.select({ count: sql<number>`COUNT(*)` }).from(trials).where(eq(trials.status, "active")),

      db.select({ count: sql<number>`COUNT(*)` }).from(sites).where(eq(sites.status, "active")),

      db.select().from(alerts).where(eq(alerts.is_resolved, false)).orderBy(desc(alerts.created_at)).limit(5),
    ]);

    const total_shipped = Number(totals?.total_shipped || 0);
    const total_used = Number(usageTotals?.total_used || 0);
    const total_wasted = Number(usageTotals?.total_wasted || 0);
    const wastage_pct = total_shipped > 0 ? Math.round((total_wasted / total_shipped) * 1000) / 10 : 0;

    const monthly_wastage = [];
    for (let i = 5; i >= 0; i--) {
      const m = subMonths(today, i);
      const mStr = format(m, "yyyy-MM");
      const ms = monthlyShipRows.find((r) => r.month === mStr);
      const mu = monthlyUsageRows.find((r) => r.month === mStr);
      monthly_wastage.push({
        month: format(m, "MMM"),
        shipped: Number(ms?.total || 0),
        used: Number(mu?.used || 0),
        wasted: Number(mu?.wasted || 0),
      });
    }

    const expiry_buckets = [
      { range: "Expired", count: Number(expired?.count || 0), quantity: Number(expired?.qty || 0) },
      { range: "< 30 days", count: Number(exp30?.count || 0), quantity: Number(exp30?.qty || 0) },
      { range: "30-60 days", count: Number(exp60?.count || 0), quantity: Number(exp60?.qty || 0) },
    ];

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
