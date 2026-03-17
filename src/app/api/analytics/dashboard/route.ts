export const revalidate = 60;
import { getDashboardSummary } from "@/lib/data";
import { successResponse, serverError } from "@/lib/api-response";

export async function GET() {
  try {
    const data = await getDashboardSummary();
    return successResponse(data);
  } catch (e) {
    return serverError(e);
  }
}
