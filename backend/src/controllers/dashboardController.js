import DashboardService from "../services/dashboardService.js";

class DashboardController {
  static async getDashboard(req, res) {
    const data = await DashboardService.getDashboardData(req.user.userId);

    return res.json({ success: true, message: "Dashboard data fetched successfully", data });
  }
}

export default DashboardController;
