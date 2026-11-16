import express from "express";

import ProfileController from "../controllers/profileController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import { changePasswordLimiter, userEndpointLimiter } from "../middlewares/rateLimitMiddleware.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/", userEndpointLimiter, ProfileController.getProfile);
router.put("/password", userEndpointLimiter, changePasswordLimiter, ProfileController.changePassword);

export default router;
