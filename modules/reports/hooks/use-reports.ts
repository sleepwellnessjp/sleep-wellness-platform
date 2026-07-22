import { reportsService } from "../services/reports-service";

export function useReportsOverview() {
  return reportsService.getOverview();
}
