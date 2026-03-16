export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { db } from "@/db";
import { alerts } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { successResponse, serverError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const resolved = searchParams.get("resolved");
    const severity = searchParams.get("severity");

    const conditions = [];
    if (resolved !== null) conditions.push(eq(alerts.is_resolved, resolved === "true"));

    const allAlerts = await db
      .select()
      .from(alerts)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(alerts.created_at));

    const filtered = severity
      ? allAlerts.filter((a) => a.severity === severity)
      : allAlerts;

    return successResponse(filtered);
  } catch (e) {
    return serverError(e);
  }
}
