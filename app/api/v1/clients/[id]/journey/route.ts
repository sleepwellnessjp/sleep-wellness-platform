import { withV1Api } from "@/lib/api-platform/with-v1";
import { v1Resources } from "@/lib/api-platform/v1-resources";

export const GET = withV1Api({ scope: "journey:read" }, ({ params }) => {
  const journey = v1Resources.getJourney(params.id);
  if (!journey) throw new Error("Not found");
  return { data: journey };
});
