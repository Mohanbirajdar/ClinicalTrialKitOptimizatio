export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { db } from "@/db";
import { kits } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { successResponse, errorResponse, serverError } from "@/lib/api-response";
import { CreateKitSchema } from "@/lib/validators/kit.schema";
import { generateId } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const allKits = await db.select().from(kits).where(
      status ? eq(kits.status, status as "available" | "low_stock" | "expired" | "depleted") : undefined
    ).orderBy(desc(kits.created_at));
    return successResponse(allKits);
  } catch (e) {
    return serverError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = CreateKitSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("VALIDATION_ERROR", parsed.error.message, 400, parsed.error.flatten());
    }
    const id = generateId();
    await db.insert(kits).values({ id, ...parsed.data });
    const [created] = await db.select().from(kits).where(eq(kits.id, id));
    return successResponse(created, undefined, 201);
  } catch (e) {
    return serverError(e);
  }
}
