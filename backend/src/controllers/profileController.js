import AuthService from "../services/authService.js";
import UserModel from "../models/UserModel.js";
import httpError from "../utils/httpError.js";

class ProfileController {
  static async getProfile(req, res) {
    const user = await UserModel.findById(req.user.userId);

    if (!user) throw httpError(404, "User not found");

    return res.json({ success: true, message: "Profile fetched successfully", data: user });
  }

  static async changePassword(req, res) {
    const { userId, role } = req.user;
    const token = await AuthService.changePassword(userId, role, req.body?.currentPassword, req.body?.newPassword);

    return res.json({
      success: true,
      message: "Password changed successfully",
      data: { token },
    });
  }
}

export default ProfileController;
