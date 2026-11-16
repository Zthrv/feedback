import express from "express";

import DashboardController from "../controllers/dashboardController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import { userEndpointLimiter } from "../middlewares/rateLimitMiddleware.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/", userEndpointLimiter, DashboardController.getDashboard);

export default router;
