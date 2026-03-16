export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { db } from "@/db";
import { shipments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { successResponse, notFound, serverError, errorResponse } from "@/lib/api-response";
import { UpdateShipmentStatusSchema } from "@/lib/validators/shipment.schema";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const parsed = UpdateShipmentStatusSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("VALIDATION_ERROR", parsed.error.message, 400);
    }
    const [existing] = await db.select().from(shipments).where(eq(shipments.id, params.id));
    if (!existing) return notFound("Shipment");
    await db.update(shipments).set(parsed.data).where(eq(shipments.id, params.id));
    const updated = await db.query.shipments.findFirst({
      where: eq(shipments.id, params.id),
      with: { site: true, kit: true },
    });
    return successResponse(updated);
  } catch (e) {
    return serverError(e);
  }
}
