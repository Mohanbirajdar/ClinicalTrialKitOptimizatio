export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { db } from "@/db";
import { trials } from "@/db/schema";
import { eq } from "drizzle-orm";
import { successResponse, notFound, serverError, errorResponse } from "@/lib/api-response";
import { UpdateTrialSchema } from "@/lib/validators/trial.schema";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const trial = await db.query.trials.findFirst({
      where: eq(trials.id, params.id),
      with: { sites: true },
    });
    if (!trial) return notFound("Trial");
    return successResponse(trial);
  } catch (e) {
    return serverError(e);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const parsed = UpdateTrialSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("VALIDATION_ERROR", parsed.error.message, 400, parsed.error.flatten());
    }
    const [existing] = await db.select().from(trials).where(eq(trials.id, params.id));
    if (!existing) return notFound("Trial");
    await db.update(trials).set(parsed.data).where(eq(trials.id, params.id));
    const [updated] = await db.select().from(trials).where(eq(trials.id, params.id));
    return successResponse(updated);
  } catch (e) {
    return serverError(e);
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const [existing] = await db.select().from(trials).where(eq(trials.id, params.id));
    if (!existing) return notFound("Trial");
    await db.delete(trials).where(eq(trials.id, params.id));
    return successResponse({ deleted: true });
  } catch (e) {
    return serverError(e);
  }
}
