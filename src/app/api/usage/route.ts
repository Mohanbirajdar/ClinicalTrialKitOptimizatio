export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { db } from "@/db";
import { kitUsage, kits } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { successResponse, errorResponse, serverError } from "@/lib/api-response";
import { CreateUsageSchema } from "@/lib/validators/usage.schema";
import { generateId } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const site_id = searchParams.get("site_id");
    const allUsage = await db.query.kitUsage.findMany({
      where: site_id ? eq(kitUsage.site_id, site_id) : undefined,
      orderBy: [desc(kitUsage.created_at)],
      with: { site: true, kit: true },
    });
    return successResponse(allUsage);
  } catch (e) {
    return serverError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = CreateUsageSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("VALIDATION_ERROR", parsed.error.message, 400, parsed.error.flatten());
    }

    const id = generateId();
    await db.insert(kitUsage).values({ id, ...parsed.data });

    // Update kit quantity
    const [kit] = await db.select().from(kits).where(eq(kits.id, parsed.data.kit_id));
    if (kit) {
      const newQty = Math.max(0, kit.quantity - parsed.data.kits_used + (parsed.data.kits_returned || 0));
      await db.update(kits).set({
        quantity: newQty,
        status: newQty === 0 ? "depleted" : newQty < 10 ? "low_stock" : "available",
      }).where(eq(kits.id, parsed.data.kit_id));
    }

    const created = await db.query.kitUsage.findFirst({
      where: eq(kitUsage.id, id),
      with: { site: true, kit: true },
    });
    return successResponse(created, undefined, 201);
  } catch (e) {
    return serverError(e);
  }
}
