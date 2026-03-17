export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    model_loaded: true,
    version: "1.0.0-js",
    engine: "built-in (ridge_regression + weighted_hybrid)",
  });
}
