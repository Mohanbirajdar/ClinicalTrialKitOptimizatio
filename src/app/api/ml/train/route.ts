export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { trainRidge } from "@/lib/demand-engine";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const samples = body.samples;

    if (!Array.isArray(samples) || samples.length < 5) {
      return errorResponse("VALIDATION_ERROR", "Need at least 5 training samples", 400);
    }

    const weights = trainRidge(samples, body.alpha ?? 1.0);
    if (!weights) {
      return errorResponse("TRAINING_ERROR", "Training failed — matrix may be singular", 500);
    }

    return successResponse({
      status: "success",
      samples_trained: samples.length,
      weights,
    });
  } catch (e) {
    console.error("[ML/train]", e);
    return errorResponse("INTERNAL_SERVER_ERROR", "Training failed", 500);
  }
}
