export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { db } from "@/db";
import { sites, kitUsage, demandForecasts } from "@/db/schema";
import { eq, and, gte, sql } from "drizzle-orm";
import { successResponse, notFound, serverError } from "@/lib/api-response";
import { predictDemandWithML } from "@/lib/demand-engine";
import { subMonths } from "date-fns";
import { generateId } from "@/lib/utils";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json().catch(() => ({}));
    const kit_type = body.kit_type || "standard";
    const months_ahead = Number(body.months_ahead) || 3;

    const site = await db.query.sites.findFirst({
      where: eq(sites.id, params.id),
      with: { trial: true },
    });
    if (!site) return notFound("Site");

    const sixMonthsAgo = subMonths(new Date(), 6);
    const historicalRows = await db
      .select({
        month: sql<string>`DATE_FORMAT(usage_date,'%Y-%m')`,
        total: sql<number>`SUM(kits_used)`,
      })
      .from(kitUsage)
      .where(
        and(
          eq(kitUsage.site_id, params.id),
          gte(kitUsage.usage_date, sixMonthsAgo.toISOString().split("T")[0])
        )
      )
      .groupBy(sql`DATE_FORMAT(usage_date,'%Y-%m')`)
      .orderBy(sql`DATE_FORMAT(usage_date,'%Y-%m')`);

    const historicalUsage = historicalRows.map((r) => Number(r.total));

    const forecast = await predictDemandWithML({
      site_id: params.id,
      enrolled_patients: site.enrolled_patients ?? 0,
      patient_capacity: site.patient_capacity,
      samples_per_patient: site.samples_per_patient ?? 1,
      historical_usage: historicalUsage,
      trial_phase: site.trial?.trial_phase ?? "Phase III",
      months_ahead,
    });

    const forecastRecord = {
      id: generateId(),
      site_id: params.id,
      kit_type,
      forecast_date: new Date().toISOString().split("T")[0],
      predicted_demand: forecast.predicted_demand,
      safety_stock: forecast.safety_stock,
      recommended_qty: forecast.recommended_qty,
      confidence_score: String(forecast.confidence_score),
      model_version: "1.0",
      months_ahead,
    };
    await db.insert(demandForecasts).values(forecastRecord);

    return successResponse({ ...forecast, site_name: site.site_name, site_id: params.id });
  } catch (e) {
    return serverError(e);
  }
}
