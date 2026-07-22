import { withV1Api } from "@/lib/api-platform/with-v1";
import { v1Resources } from "@/lib/api-platform/v1-resources";

export const GET = withV1Api({ scope: "clients:read" }, () => ({
  data: v1Resources.listClients(),
}));
