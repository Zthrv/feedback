import express from "express";

import AuthController from "../controllers/authController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import {
  userEndpointLimiter,
  loginLimiter,
  loginIpLimiter,
  forgotPasswordLimiter,
  resetPasswordLimiter,
} from "../middlewares/rateLimitMiddleware.js";

const router = express.Router();

// No public /register: only an admin can add accounts (POST /api/admin/users)
router.post("/login", loginIpLimiter, loginLimiter, AuthController.login);
router.post("/logout", authMiddleware, userEndpointLimiter, AuthController.logout);
router.post("/forgot-password", forgotPasswordLimiter, AuthController.forgotPassword);
router.post("/reset-password", resetPasswordLimiter, AuthController.resetPassword);

export default router;
