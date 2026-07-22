import { retreatService } from "../services/retreat-service";

export function useRetreatOverview() {
  return retreatService.getOverview();
}
