export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { db } from "@/db";
import { shipments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { successResponse, notFound, serverError } from "@/lib/api-response";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const shipment = await db.query.shipments.findFirst({
      where: eq(shipments.id, params.id),
      with: { site: { with: { trial: true } }, kit: true },
    });
    if (!shipment) return notFound("Shipment");
    return successResponse(shipment);
  } catch (e) {
    return serverError(e);
  }
}
