import { companiesService } from "../services/companies-service";

export function useCompaniesOverview() {
  return companiesService.getOverview();
}
