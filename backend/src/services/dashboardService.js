import DashboardModel from "../models/DashboardModel.js";

// One side must be at least 1.3x the other to count as dominant; closer is Balanced.
// Only affects dashboard grouping, not how any feedback is classified.
const DOMINANCE_RATIO = 1.3;

class DashboardService {
  static calculateSpectrum(positive, negative) {
    if (positive === 0 && negative === 0) return "Balanced";

    if (negative === 0 || positive >= negative * DOMINANCE_RATIO) {
      return positive - negative >= 5 ? "Excellent" : "Good";
    }

    if (positive === 0 || negative >= positive * DOMINANCE_RATIO) return "Needs Improvement";

    return "Balanced";
  }

  static async getDashboardData(userId) {
    const attributes = await DashboardModel.getDashboardData(userId);

    return attributes.map((a) => {
      const positive = Number(a.positive);
      const negative = Number(a.negative);

      return {
        attribute_id: a.attribute_id,
        attribute_name: a.attribute_name,
        description: a.description,
        icon_name: a.icon_name,
        positive,
        negative,
        neutral: Number(a.neutral),
        total: Number(a.total),
        spectrum: this.calculateSpectrum(positive, negative),
      };
    });
  }
}

export default DashboardService;
