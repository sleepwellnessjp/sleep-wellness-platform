/**
 * Dashboard aggregates live in domain stores / platform APIs.
 * Keep this repository as the module-facing data boundary.
 */
export async function fetchDashboardSnapshot() {
  return { source: "platform" as const, generatedAt: new Date().toISOString() };
}
