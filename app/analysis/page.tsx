import { redirect } from "next/navigation";

/**
 * Version 1.0 Beta — 旧デモ workspace は廃止し、本番 SOXAI フローへ誘導する。
 */
export default async function AnalysisIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  const params = await searchParams;
  const clientId =
    typeof params.clientId === "string" ? params.clientId.trim() : "";

  if (clientId) {
    redirect(`/analysis/new?clientId=${encodeURIComponent(clientId)}`);
  }

  redirect("/analysis/new");
}
