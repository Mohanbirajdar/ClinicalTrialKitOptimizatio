export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { db } from "@/db";
import { shipments, kits } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { successResponse, errorResponse, serverError } from "@/lib/api-response";
import { CreateShipmentSchema } from "@/lib/validators/shipment.schema";
import { generateId } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const site_id = searchParams.get("site_id");
    const status = searchParams.get("status");

    const allShipments = await db.query.shipments.findMany({
      where: site_id ? eq(shipments.site_id, site_id) : undefined,
      orderBy: [desc(shipments.created_at)],
      with: { site: true, kit: true },
    });

    const filtered = status
      ? allShipments.filter((s) => s.status === status)
      : allShipments;

    return successResponse(filtered);
  } catch (e) {
    return serverError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = CreateShipmentSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("VALIDATION_ERROR", parsed.error.message, 400, parsed.error.flatten());
    }

    // Check kit availability
    const [kit] = await db.select().from(kits).where(eq(kits.id, parsed.data.kit_id));
    if (!kit) return errorResponse("NOT_FOUND", "Kit not found", 404);
    if (kit.quantity < parsed.data.quantity) {
      return errorResponse("INSUFFICIENT_STOCK", `Only ${kit.quantity} units available`, 400);
    }

    const id = generateId();
    await db.insert(shipments).values({ id, ...parsed.data });

    // Deduct from kit inventory
    await db.update(kits)
      .set({
        quantity: kit.quantity - parsed.data.quantity,
        status: kit.quantity - parsed.data.quantity < 10 ? "low_stock" : "available",
      })
      .where(eq(kits.id, parsed.data.kit_id));

    const created = await db.query.shipments.findFirst({
      where: eq(shipments.id, id),
      with: { site: true, kit: true },
    });
    return successResponse(created, undefined, 201);
  } catch (e) {
    return serverError(e);
  }
}
