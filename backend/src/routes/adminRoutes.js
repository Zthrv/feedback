import express from "express";

import AdminController from "../controllers/adminController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import { requireRole, ROLES } from "../middlewares/roleMiddleware.js";
import { userEndpointLimiter } from "../middlewares/rateLimitMiddleware.js";

const router = express.Router();

// Every route below needs a valid session AND the Admin role
router.use(authMiddleware, requireRole(ROLES.ADMIN));

// The only way an account can be added
router.post("/users", userEndpointLimiter, AdminController.createUser);

// Read-only views: there is no route to edit or delete feedback from here
router.get("/feedback", userEndpointLimiter, AdminController.listAllFeedback);
router.get("/abuse-log", userEndpointLimiter, AdminController.listAbuseLog);

// Irrelevant reports: list, then decide with { decision: "remove" | "keep" }
router.get("/irrelevant-reports", userEndpointLimiter, AdminController.listIrrelevantReports);
router.post("/irrelevant-reports/:feedbackId", userEndpointLimiter, AdminController.resolveIrrelevantReport);

// Not classified by the LLM: list, then decide with { decision: "deliver", tags } or { decision: "remove" }
router.get("/unclassified", userEndpointLimiter, AdminController.listUnclassified);
router.post("/unclassified/:feedbackId", userEndpointLimiter, AdminController.resolveUnclassified);

export default router;
