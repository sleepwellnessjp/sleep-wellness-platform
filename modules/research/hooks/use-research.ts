import { researchService } from "../services/research-service";

export function useResearchOverview() {
  return researchService.getOverview();
}
