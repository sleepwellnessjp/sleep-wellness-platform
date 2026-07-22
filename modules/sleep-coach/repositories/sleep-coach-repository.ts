/** Sleep Coach is derived daily; no dedicated table yet. */
export async function fetchCoachDayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}
