export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { db } from "@/db";
import { sites } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { successResponse, errorResponse, serverError } from "@/lib/api-response";
import { CreateSiteSchema } from "@/lib/validators/site.schema";
import { generateId } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const trial_id = searchParams.get("trial_id");
    const allSites = await db.query.sites.findMany({
      where: trial_id ? eq(sites.trial_id, trial_id) : undefined,
      orderBy: [desc(sites.created_at)],
      with: { trial: true },
    });
    return successResponse(allSites);
  } catch (e) {
    return serverError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = CreateSiteSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("VALIDATION_ERROR", parsed.error.message, 400, parsed.error.flatten());
    }
    const id = generateId();
    await db.insert(sites).values({ id, ...parsed.data });
    const created = await db.query.sites.findFirst({
      where: eq(sites.id, id),
      with: { trial: true },
    });
    return successResponse(created, undefined, 201);
  } catch (e) {
    return serverError(e);
  }
}
