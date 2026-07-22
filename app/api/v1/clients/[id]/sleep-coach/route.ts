import { withV1Api } from "@/lib/api-platform/with-v1";
import { v1Resources } from "@/lib/api-platform/v1-resources";

export const GET = withV1Api({ scope: "sleep-coach:read" }, ({ params }) => {
  const coach = v1Resources.getSleepCoach(params.id);
  if (!coach) throw new Error("Not found");
  return { data: coach };
});
