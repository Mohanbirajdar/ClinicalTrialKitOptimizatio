export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { db } from "@/db";
import { kits } from "@/db/schema";
import { eq } from "drizzle-orm";
import { successResponse, notFound, serverError, errorResponse } from "@/lib/api-response";
import { UpdateKitSchema } from "@/lib/validators/kit.schema";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const [kit] = await db.select().from(kits).where(eq(kits.id, params.id));
    if (!kit) return notFound("Kit");
    return successResponse(kit);
  } catch (e) {
    return serverError(e);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const parsed = UpdateKitSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("VALIDATION_ERROR", parsed.error.message, 400, parsed.error.flatten());
    }
    const [existing] = await db.select().from(kits).where(eq(kits.id, params.id));
    if (!existing) return notFound("Kit");
    await db.update(kits).set(parsed.data).where(eq(kits.id, params.id));
    const [updated] = await db.select().from(kits).where(eq(kits.id, params.id));
    return successResponse(updated);
  } catch (e) {
    return serverError(e);
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const [existing] = await db.select().from(kits).where(eq(kits.id, params.id));
    if (!existing) return notFound("Kit");
    await db.delete(kits).where(eq(kits.id, params.id));
    return successResponse({ deleted: true });
  } catch (e) {
    return serverError(e);
  }
}
