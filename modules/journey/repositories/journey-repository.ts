/** Journey is computed from analysis history. */
export async function fetchJourneyInputs() {
  return { source: "analyses" as const };
}
