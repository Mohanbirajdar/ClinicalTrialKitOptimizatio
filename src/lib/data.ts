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

// ─── HELPERS ─────────────────────────────────────────────────────────────────

export function withTimeout<T>(promise: Promise<T>, ms = 25000): Promise<T> {
  // Attach a no-op catch so late rejections from the original promise
  // (e.g. the other 12 queries still in-flight after Promise.all rejects on the first failure)
  // don't become unhandledRejections that trigger Next.js's error boundary crash.
  promise.catch(() => {});
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`DB query timed out after ${ms}ms`)), ms)
    ),
  ]);
}

// ─── DASHBOARD ───────────────────────────────────────────────────────────────

export async function getDashboardSummary() {
  const today = new Date();
  const today_str = today.toISOString().split("T")[0];
  const d30 = addDays(today, 30).toISOString().split("T")[0];
  const d60 = addDays(today, 60).toISOString().split("T")[0];
  const d180 = subMonths(today, 6).toISOString().split("T")[0];

  // silence() attaches a no-op .catch() to each individual query promise so that
  // when Promise.all rejects early (first failure), the remaining in-flight promises
  // don't surface as unhandledRejections and trigger Next.js's error boundary crash.
  const silence = <T>(p: Promise<T>): Promise<T> => { p.catch(() => {}); return p; };

  // Run all independent queries in parallel (11 queries, down from 13 — expiry merged)
  const [
    [shipTotals],
    [usageTotals],
    monthlyShipRows,
    monthlyUsageRows,
    [expiryBuckets],       // merged: exp30 + exp60 + expired in a single query
    allSitesList,
    siteUsageRows,
    siteShipRows,
    [activeTrialsRow],
    [activeSitesRow],
    recent_alerts,
  ] = await withTimeout(Promise.all([
    // total shipped
    silence(db.select({ total: sql<number>`COALESCE(SUM(quantity), 0)` })
      .from(shipments)
      .where(sql`status != 'cancelled'::shipment_status`)),

    // total used/wasted
    silence(db.select({
      used: sql<number>`COALESCE(SUM(kits_used), 0)`,
      wasted: sql<number>`COALESCE(SUM(kits_wasted), 0)`,
    }).from(kitUsage)),

    // monthly shipments (last 6 months)
    silence(db.select({
      month: sql<string>`TO_CHAR(shipment_date, 'YYYY-MM')`,
      total: sql<number>`COALESCE(SUM(quantity), 0)`,
    })
      .from(shipments)
      .where(sql`status != 'cancelled'::shipment_status AND shipment_date >= ${d180}`)
      .groupBy(sql`TO_CHAR(shipment_date, 'YYYY-MM')`)),

    // monthly usage (last 6 months)
    silence(db.select({
      month: sql<string>`TO_CHAR(usage_date, 'YYYY-MM')`,
      used: sql<number>`COALESCE(SUM(kits_used), 0)`,
      wasted: sql<number>`COALESCE(SUM(kits_wasted), 0)`,
    })
      .from(kitUsage)
      .where(sql`usage_date >= ${d180}`)
      .groupBy(sql`TO_CHAR(usage_date, 'YYYY-MM')`)),

    // all expiry buckets in one query using FILTER aggregates (3 queries → 1)
    silence(db.select({
      exp30_count:  sql<number>`COUNT(*) FILTER (WHERE expiry_date >= ${today_str} AND expiry_date < ${d30} AND quantity > 0)`,
      exp30_qty:    sql<number>`COALESCE(SUM(quantity) FILTER (WHERE expiry_date >= ${today_str} AND expiry_date < ${d30} AND quantity > 0), 0)`,
      exp60_count:  sql<number>`COUNT(*) FILTER (WHERE expiry_date >= ${d30} AND expiry_date < ${d60} AND quantity > 0)`,
      exp60_qty:    sql<number>`COALESCE(SUM(quantity) FILTER (WHERE expiry_date >= ${d30} AND expiry_date < ${d60} AND quantity > 0), 0)`,
      expired_count: sql<number>`COUNT(*) FILTER (WHERE expiry_date < ${today_str} AND quantity > 0)`,
      expired_qty:   sql<number>`COALESCE(SUM(quantity) FILTER (WHERE expiry_date < ${today_str} AND quantity > 0), 0)`,
    }).from(kits)),

    // sites list
    silence(db.select().from(sites).limit(10)),

    // site usage aggregates
    silence(db.select({
      site_id: kitUsage.site_id,
      kits_used: sql<number>`COALESCE(SUM(kits_used), 0)`,
      kits_wasted: sql<number>`COALESCE(SUM(kits_wasted), 0)`,
    }).from(kitUsage).groupBy(kitUsage.site_id)),

    // site shipment aggregates
    silence(db.select({
      site_id: shipments.site_id,
      kits_shipped: sql<number>`COALESCE(SUM(quantity), 0)`,
    }).from(shipments).where(sql`status != 'cancelled'::shipment_status`).groupBy(shipments.site_id)),

    // active trials count
    silence(db.select({ count: sql<number>`COUNT(*)` }).from(trials).where(eq(trials.status, "active"))),

    // active sites count
    silence(db.select({ count: sql<number>`COUNT(*)` }).from(sites).where(eq(sites.status, "active"))),

    // recent unresolved alerts
    silence(db.select().from(alerts).where(eq(alerts.is_resolved, false)).orderBy(desc(alerts.created_at)).limit(5)),
  ]));

  const total_shipped = Number(shipTotals?.total || 0);
  const total_used = Number(usageTotals?.used || 0);
  const total_wasted = Number(usageTotals?.wasted || 0);
  const wastage_pct =
    total_shipped > 0 ? Math.round((total_wasted / total_shipped) * 1000) / 10 : 0;

  // Build monthly_wastage from grouped rows
  const monthly_wastage = [];
  for (let i = 5; i >= 0; i--) {
    const m = subMonths(today, i);
    const mStr = format(m, "yyyy-MM");
    const mLabel = format(m, "MMM");
    const ms = monthlyShipRows.find((r) => r.month === mStr);
    const mu = monthlyUsageRows.find((r) => r.month === mStr);
    monthly_wastage.push({
      month: mLabel,
      shipped: Number(ms?.total || 0),
      used: Number(mu?.used || 0),
      wasted: Number(mu?.wasted || 0),
    });
  }

  const expiry_buckets = [
    { range: "Expired",    count: Number(expiryBuckets?.expired_count || 0), quantity: Number(expiryBuckets?.expired_qty || 0) },
    { range: "< 30 days",  count: Number(expiryBuckets?.exp30_count   || 0), quantity: Number(expiryBuckets?.exp30_qty   || 0) },
    { range: "30-60 days", count: Number(expiryBuckets?.exp60_count   || 0), quantity: Number(expiryBuckets?.exp60_qty   || 0) },
  ];

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
    kits_expiring_30: Number(expiryBuckets?.exp30_count || 0),
    kits_expiring_60: Number(expiryBuckets?.exp60_count || 0),
  };
}
