/**
 * Server-side data fetching functions.
 * Used directly by Next.js server components — no HTTP round-trips.
 */
import { db } from "@/db";
import { trials, sites, kits, shipments, kitUsage, alerts } from "@/db/schema";
import { eq, desc, lt, gt, and, or, sql, gte } from "drizzle-orm";
import { addDays, subMonths, format } from "date-fns";
import type { Alert } from "@/types";

// ─── TRIALS ──────────────────────────────────────────────────────────────────

export async function getAllTrials() {
  return db.query.trials.findMany({
    orderBy: [desc(trials.created_at)],
    with: { sites: true },
  });
}

export async function getTrialById(id: string) {
  return db.query.trials.findFirst({
    where: eq(trials.id, id),
    with: { sites: true },
  });
}

// ─── SITES ───────────────────────────────────────────────────────────────────

export async function getAllSites(trial_id?: string) {
  return db.query.sites.findMany({
    where: trial_id ? eq(sites.trial_id, trial_id) : undefined,
    orderBy: [desc(sites.created_at)],
    with: { trial: true },
  });
}

export async function getSiteById(id: string) {
  return db.query.sites.findFirst({
    where: eq(sites.id, id),
    with: { trial: true, shipments: { with: { kit: true } }, forecasts: true },
  });
}

// ─── KITS ────────────────────────────────────────────────────────────────────

export async function getAllKits(status?: string) {
  return db
    .select()
    .from(kits)
    .where(
      status
        ? eq(kits.status, status as "available" | "low_stock" | "expired" | "depleted")
        : undefined
    )
    .orderBy(desc(kits.created_at));
}

export async function getExpiringKits(days = 60) {
  const today = new Date().toISOString().split("T")[0];
  const future = addDays(new Date(), days).toISOString().split("T")[0];
  const d30 = addDays(new Date(), 30).toISOString().split("T")[0];

  const expiringKits = await db
    .select()
    .from(kits)
    .where(
      and(
        lt(kits.expiry_date, future),
        gt(kits.quantity, 0),
        or(eq(kits.status, "available"), eq(kits.status, "low_stock"))
      )
    )
    .orderBy(kits.expiry_date);

  return {
    kits: expiringKits,
    grouped: {
      expired: expiringKits.filter((k) => k.expiry_date < today),
      within_30: expiringKits.filter(
        (k) => k.expiry_date >= today && k.expiry_date < d30
      ),
      within_60: expiringKits.filter(
        (k) => k.expiry_date >= d30 && k.expiry_date < future
      ),
    },
    total: expiringKits.length,
  };
}

// ─── SHIPMENTS ───────────────────────────────────────────────────────────────

export async function getAllShipments(site_id?: string) {
  return db.query.shipments.findMany({
    where: site_id ? eq(shipments.site_id, site_id) : undefined,
    orderBy: [desc(shipments.created_at)],
    with: { site: true, kit: true },
  });
}

// ─── USAGE ───────────────────────────────────────────────────────────────────

export async function getAllUsage(site_id?: string) {
  return db.query.kitUsage.findMany({
    where: site_id ? eq(kitUsage.site_id, site_id) : undefined,
    orderBy: [desc(kitUsage.created_at)],
    with: { site: true, kit: true },
  });
}

// ─── DASHBOARD ───────────────────────────────────────────────────────────────

export async function getDashboardSummary() {
  const today = new Date();
  const today_str = today.toISOString().split("T")[0];
  const d30 = addDays(today, 30).toISOString().split("T")[0];
  const d60 = addDays(today, 60).toISOString().split("T")[0];

  // Totals
  const [shipTotals] = await db
    .select({ total: sql<number>`COALESCE(SUM(quantity), 0)` })
    .from(shipments)
    .where(sql`status != 'cancelled'::shipment_status`);

  const [usageTotals] = await db
    .select({
      used: sql<number>`COALESCE(SUM(kits_used), 0)`,
      wasted: sql<number>`COALESCE(SUM(kits_wasted), 0)`,
    })
    .from(kitUsage);

  const total_shipped = Number(shipTotals?.total || 0);
  const total_used = Number(usageTotals?.used || 0);
  const total_wasted = Number(usageTotals?.wasted || 0);
  const wastage_pct =
    total_shipped > 0
      ? Math.round((total_wasted / total_shipped) * 1000) / 10
      : 0;

  // Monthly (last 6 months)
  const monthly_wastage = [];
  for (let i = 5; i >= 0; i--) {
    const m = subMonths(today, i);
    const mStr = format(m, "yyyy-MM");
    const mLabel = format(m, "MMM");

    const [ms] = await db
      .select({ total: sql<number>`COALESCE(SUM(quantity), 0)` })
      .from(shipments)
      .where(sql`TO_CHAR(shipment_date, 'YYYY-MM') = ${mStr} AND status != 'cancelled'`);

    const [mu] = await db
      .select({
        used: sql<number>`COALESCE(SUM(kits_used), 0)`,
        wasted: sql<number>`COALESCE(SUM(kits_wasted), 0)`,
      })
      .from(kitUsage)
      .where(sql`TO_CHAR(usage_date, 'YYYY-MM') = ${mStr}`);

    monthly_wastage.push({
      month: mLabel,
      shipped: Number(ms?.total || 0),
      used: Number(mu?.used || 0),
      wasted: Number(mu?.wasted || 0),
    });
  }

  // Expiry buckets
  const [exp30] = await db
    .select({
      count: sql<number>`COUNT(*)`,
      qty: sql<number>`COALESCE(SUM(quantity), 0)`,
    })
    .from(kits)
    .where(and(lt(kits.expiry_date, d30), gte(kits.expiry_date, today_str), gt(kits.quantity, 0)));

  const [exp60] = await db
    .select({
      count: sql<number>`COUNT(*)`,
      qty: sql<number>`COALESCE(SUM(quantity), 0)`,
    })
    .from(kits)
    .where(and(lt(kits.expiry_date, d60), gte(kits.expiry_date, d30), gt(kits.quantity, 0)));

  const [expired] = await db
    .select({
      count: sql<number>`COUNT(*)`,
      qty: sql<number>`COALESCE(SUM(quantity), 0)`,
    })
    .from(kits)
    .where(and(lt(kits.expiry_date, today_str), gt(kits.quantity, 0)));

  const expiry_buckets = [
    { range: "Expired", count: Number(expired?.count || 0), quantity: Number(expired?.qty || 0) },
    { range: "< 30 days", count: Number(exp30?.count || 0), quantity: Number(exp30?.qty || 0) },
    { range: "30-60 days", count: Number(exp60?.count || 0), quantity: Number(exp60?.qty || 0) },
  ];

  // Site usage
  const allSitesList = await db.select().from(sites).limit(10);
  const siteUsageRows = await db
    .select({
      site_id: kitUsage.site_id,
      kits_used: sql<number>`COALESCE(SUM(kits_used), 0)`,
      kits_wasted: sql<number>`COALESCE(SUM(kits_wasted), 0)`,
    })
    .from(kitUsage)
    .groupBy(kitUsage.site_id);

  const siteShipRows = await db
    .select({
      site_id: shipments.site_id,
      kits_shipped: sql<number>`COALESCE(SUM(quantity), 0)`,
    })
    .from(shipments)
    .where(sql`status != 'cancelled'::shipment_status`)
    .groupBy(shipments.site_id);

  const site_usage = allSitesList.map((s) => {
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
  const [activeTrialsRow] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(trials)
    .where(eq(trials.status, "active"));
  const [activeSitesRow] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(sites)
    .where(eq(sites.status, "active"));

  // Recent alerts
  const recent_alerts = await db
    .select()
    .from(alerts)
    .where(eq(alerts.is_resolved, false))
    .orderBy(desc(alerts.created_at))
    .limit(5);

  return {
    total_shipped,
    total_used,
    total_wasted,
    wastage_pct,
    shipped_trend: 0,
    used_trend: 0,
    wastage_trend: 0,
    wastage_pct_trend: 0,
    monthly_wastage,
    expiry_buckets,
    site_usage,
    recent_alerts: recent_alerts as Alert[],
    active_trials: Number(activeTrialsRow?.count || 0),
    active_sites: Number(activeSitesRow?.count || 0),
    kits_expiring_30: Number(exp30?.count || 0),
    kits_expiring_60: Number(exp60?.count || 0),
  };
}
