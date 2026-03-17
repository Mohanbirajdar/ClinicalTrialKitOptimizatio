export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { predictDemand } from "@/lib/demand-engine";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!Array.isArray(body)) {
      return errorResponse("VALIDATION_ERROR", "Request body must be an array", 400);
    }
    const results = body.map((item) =>
      predictDemand({
        site_id: item.site_id ?? "",
        enrolled_patients: Number(item.enrolled_patients ?? 0),
        patient_capacity: Number(item.patient_capacity ?? item.enrolled_patients ?? 1),
        samples_per_patient: Number(item.samples_per_patient ?? 1),
        historical_usage: Array.isArray(item.historical_usage) ? item.historical_usage : [],
        trial_phase: item.trial_phase ?? "Phase III",
        months_ahead: Number(item.months_ahead ?? 3),
      })
    );
    return successResponse(results);
  } catch (e) {
    console.error("[ML/predict/batch]", e);
    return errorResponse("INTERNAL_SERVER_ERROR", "Batch prediction failed", 500);
  }
}
