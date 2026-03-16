export const dynamic = "force-dynamic";
import { runAlertScan } from "@/lib/alert-engine";
import { successResponse, serverError } from "@/lib/api-response";

export async function POST() {
  try {
    const result = await runAlertScan();
    return successResponse(result);
  } catch (e) {
    return serverError(e);
  }
}
