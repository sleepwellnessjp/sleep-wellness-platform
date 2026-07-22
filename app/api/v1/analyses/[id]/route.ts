import { withV1Api } from "@/lib/api-platform/with-v1";
import { v1Resources } from "@/lib/api-platform/v1-resources";

export const GET = withV1Api({ scope: "analysis:read" }, ({ params }) => {
  const analysis = v1Resources.getAnalysis(params.id);
  if (!analysis) throw new Error("Not found");
  return { data: analysis };
});
