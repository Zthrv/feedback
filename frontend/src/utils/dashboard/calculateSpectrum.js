// Kept in sync with the backend's DashboardService.calculateSpectrum (not currently called
// from anywhere in the frontend - the dashboard uses the "spectrum" field the API returns).
export function calculateSpectrum(positive, negative) {
  const DOMINANCE_RATIO = 1.3;

  if (positive === 0 && negative === 0) return "Balanced";

  const positiveDominant = negative === 0 || positive >= negative * DOMINANCE_RATIO;
  if (positiveDominant) return positive - negative >= 5 ? "Excellent" : "Good";

  const negativeDominant = positive === 0 || negative >= positive * DOMINANCE_RATIO;
  if (negativeDominant) return "Needs Improvement";

  return "Balanced";
}
