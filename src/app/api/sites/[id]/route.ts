export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { db } from "@/db";
import { sites } from "@/db/schema";
import { eq } from "drizzle-orm";
import { successResponse, notFound, serverError, errorResponse } from "@/lib/api-response";
import { UpdateSiteSchema } from "@/lib/validators/site.schema";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const site = await db.query.sites.findFirst({
      where: eq(sites.id, params.id),
      with: { trial: true, shipments: { with: { kit: true } }, forecasts: true },
    });
    if (!site) return notFound("Site");
    return successResponse(site);
  } catch (e) {
    return serverError(e);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const parsed = UpdateSiteSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("VALIDATION_ERROR", parsed.error.message, 400, parsed.error.flatten());
    }
    const [existing] = await db.select().from(sites).where(eq(sites.id, params.id));
    if (!existing) return notFound("Site");
    await db.update(sites).set(parsed.data).where(eq(sites.id, params.id));
    const updated = await db.query.sites.findFirst({
      where: eq(sites.id, params.id),
      with: { trial: true },
    });
    return successResponse(updated);
  } catch (e) {
    return serverError(e);
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const [existing] = await db.select().from(sites).where(eq(sites.id, params.id));
    if (!existing) return notFound("Site");
    await db.delete(sites).where(eq(sites.id, params.id));
    return successResponse({ deleted: true });
  } catch (e) {
    return serverError(e);
  }
}
