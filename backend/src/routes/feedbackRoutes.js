import express from "express";

import FeedbackController from "../controllers/feedbackController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import feedbackOwnerMiddleware from "../middlewares/feedbackOwnerMiddleware.js";
import { feedbackLimiter, userEndpointLimiter } from "../middlewares/rateLimitMiddleware.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/recipients", userEndpointLimiter, FeedbackController.getRecipients);
router.get("/blocked-words", userEndpointLimiter, FeedbackController.getBlockedWords);
router.get("/sent-summary", userEndpointLimiter, FeedbackController.getSentSummary);
router.get("/received", userEndpointLimiter, FeedbackController.getReceived);

// Actions on one received feedback: only its recipient gets past feedbackOwnerMiddleware
router.post("/:feedbackId/review", userEndpointLimiter, feedbackOwnerMiddleware, FeedbackController.requestReview);
router.post("/:feedbackId/abuse", userEndpointLimiter, feedbackOwnerMiddleware, FeedbackController.reportAbuse);
router.post("/:feedbackId/irrelevant", userEndpointLimiter, feedbackOwnerMiddleware, FeedbackController.reportIrrelevant);

router.post("/", userEndpointLimiter, feedbackLimiter, FeedbackController.createFeedback);

export default router;
