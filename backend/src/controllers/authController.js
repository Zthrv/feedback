import AuthService from "../services/authService.js";
import UserModel from "../models/UserModel.js";

class AuthController {
  static async login(req, res) {
    const { email, password } = req.body || {};
    const data = await AuthService.login(email, password);

    return res.json({ success: true, message: "Login successful", data });
  }

  // Every token issued to this user so far stops working
  static async logout(req, res) {
    await UserModel.logout(req.user.userId);

    return res.json({ success: true, message: "Logged out" });
  }

  static async forgotPassword(req, res) {
    await AuthService.forgotPassword(req.body?.email);

    return res.json({
      success: true,
      message: "If an account exists for that email, a password reset link has been issued.",
    });
  }

  static async resetPassword(req, res) {
    const { token, password } = req.body || {};
    await AuthService.resetPassword(token, password);

    return res.json({
      success: true,
      message: "Password reset successful. You can now log in.",
    });
  }
}

export default AuthController;
