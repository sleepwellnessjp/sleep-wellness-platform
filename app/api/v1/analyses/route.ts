import { withV1Api } from "@/lib/api-platform/with-v1";
import { v1Resources } from "@/lib/api-platform/v1-resources";

export const GET = withV1Api({ scope: "analysis:read" }, ({ request }) => {
  const clientId = new URL(request.url).searchParams.get("clientId") ?? undefined;
  return { data: v1Resources.listAnalyses(clientId) };
});
