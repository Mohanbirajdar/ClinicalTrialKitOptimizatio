export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { db } from "@/db";
import { sites, kitUsage, demandForecasts } from "@/db/schema";
import { eq, and, gte, sql } from "drizzle-orm";
import { successResponse, notFound, serverError, errorResponse } from "@/lib/api-response";
import { predictDemandWithML } from "@/lib/demand-engine";
import { subMonths } from "date-fns";
import { generateId } from "@/lib/utils";
import { z } from "zod";

const ForecastBodySchema = z.object({
  site_id: z.string().uuid(),
  kit_type: z.string().default("standard"),
  months_ahead: z.number().int().min(1).max(12).default(3),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = ForecastBodySchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("VALIDATION_ERROR", parsed.error.message, 400);
    }

    const { site_id, kit_type, months_ahead } = parsed.data;
    const site = await db.query.sites.findFirst({
      where: eq(sites.id, site_id),
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
      .where(and(
        eq(kitUsage.site_id, site_id),
        gte(kitUsage.usage_date, sixMonthsAgo.toISOString().split("T")[0])
      ))
      .groupBy(sql`DATE_FORMAT(usage_date,'%Y-%m')`)
      .orderBy(sql`DATE_FORMAT(usage_date,'%Y-%m')`);

    const historicalUsage = historicalRows.map((r) => Number(r.total));

    const forecast = await predictDemandWithML({
      site_id,
      enrolled_patients: site.enrolled_patients ?? 0,
      patient_capacity: site.patient_capacity,
      samples_per_patient: site.samples_per_patient ?? 1,
      historical_usage: historicalUsage,
      trial_phase: site.trial?.trial_phase ?? "Phase III",
      months_ahead,
    });

    await db.insert(demandForecasts).values({
      id: generateId(),
      site_id,
      kit_type,
      forecast_date: new Date().toISOString().split("T")[0],
      predicted_demand: forecast.predicted_demand,
      safety_stock: forecast.safety_stock,
      recommended_qty: forecast.recommended_qty,
      confidence_score: String(forecast.confidence_score),
      model_version: "1.0",
      months_ahead,
    });

    return successResponse({ ...forecast, site_name: site.site_name });
  } catch (e) {
    return serverError(e);
  }
}
