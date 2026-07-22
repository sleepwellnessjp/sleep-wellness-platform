import { eventsService } from "../services/events-service";

export function useEventsOverview() {
  return eventsService.getOverview();
}
