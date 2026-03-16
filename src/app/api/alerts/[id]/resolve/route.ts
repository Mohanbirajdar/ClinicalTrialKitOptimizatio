export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { db } from "@/db";
import { alerts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { successResponse, notFound, serverError } from "@/lib/api-response";

export async function PATCH(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const [existing] = await db.select().from(alerts).where(eq(alerts.id, params.id));
    if (!existing) return notFound("Alert");
    await db.update(alerts).set({ is_resolved: true, resolved_at: new Date() }).where(eq(alerts.id, params.id));
    const [updated] = await db.select().from(alerts).where(eq(alerts.id, params.id));
    return successResponse(updated);
  } catch (e) {
    return serverError(e);
  }
}
