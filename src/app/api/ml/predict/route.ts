export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { predictDemand } from "@/lib/demand-engine";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.site_id || body.enrolled_patients == null) {
      return errorResponse("VALIDATION_ERROR", "site_id and enrolled_patients are required", 400);
    }
    const result = predictDemand({
      site_id: body.site_id,
      enrolled_patients: Number(body.enrolled_patients),
      patient_capacity: Number(body.patient_capacity ?? body.enrolled_patients),
      samples_per_patient: Number(body.samples_per_patient ?? 1),
      historical_usage: Array.isArray(body.historical_usage) ? body.historical_usage : [],
      trial_phase: body.trial_phase ?? "Phase III",
      months_ahead: Number(body.months_ahead ?? 3),
    });
    return successResponse(result);
  } catch (e) {
    console.error("[ML/predict]", e);
    return errorResponse("INTERNAL_SERVER_ERROR", "Prediction failed", 500);
  }
}
