export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { db } from "@/db";
import { trials, sites } from "@/db/schema";
import { eq, desc, count } from "drizzle-orm";
import { successResponse, errorResponse, serverError } from "@/lib/api-response";
import { CreateTrialSchema } from "@/lib/validators/trial.schema";
import { generateId } from "@/lib/utils";

export async function GET() {
  try {
    const allTrials = await db.query.trials.findMany({
      orderBy: [desc(trials.created_at)],
      with: { sites: true },
    });
    return successResponse(allTrials);
  } catch (e) {
    return serverError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = CreateTrialSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("VALIDATION_ERROR", parsed.error.message, 400, parsed.error.flatten());
    }
    const id = generateId();
    await db.insert(trials).values({ id, ...parsed.data });
    const [created] = await db.select().from(trials).where(eq(trials.id, id));
    return successResponse(created, undefined, 201);
  } catch (e) {
    return serverError(e);
  }
}
