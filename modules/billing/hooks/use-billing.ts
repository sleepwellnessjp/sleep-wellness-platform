import { billingService } from "../services/billing-service";

export function useBillingOverview() {
  return billingService.getOverview();
}
