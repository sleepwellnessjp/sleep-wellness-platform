import { withV1Api } from "@/lib/api-platform/with-v1";
import { v1Resources } from "@/lib/api-platform/v1-resources";

export const GET = withV1Api({ scope: "reports:read" }, ({ params }) => {
  const report = v1Resources.getReport(params.id);
  if (!report) throw new Error("Not found");
  return { data: report };
});
