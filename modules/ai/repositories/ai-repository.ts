/** AI outputs are derived; persistence stays with analysis / client repos. */
export async function fetchAiContextStub() {
  return { ready: true as const };
}
