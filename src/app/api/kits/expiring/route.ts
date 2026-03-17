export const revalidate = 60;
import { NextRequest } from "next/server";
import { db } from "@/db";
import { kits } from "@/db/schema";
import { lt, gt, and, or, eq } from "drizzle-orm";
import { successResponse, serverError } from "@/lib/api-response";
import { addDays } from "date-fns";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const days = Number(searchParams.get("days") || 60);
    const today = new Date().toISOString().split("T")[0];
    const future = addDays(new Date(), days).toISOString().split("T")[0];

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

    const grouped = {
      expired: expiringKits.filter((k) => k.expiry_date < today),
      within_30: expiringKits.filter(
        (k) => k.expiry_date >= today && k.expiry_date < addDays(new Date(), 30).toISOString().split("T")[0]
      ),
      within_60: expiringKits.filter(
        (k) =>
          k.expiry_date >= addDays(new Date(), 30).toISOString().split("T")[0] &&
          k.expiry_date < future
      ),
    };

    return successResponse({ kits: expiringKits, grouped, total: expiringKits.length });
  } catch (e) {
    return serverError(e);
  }
}
