import FeedbackModel from "../models/FeedbackModel.js";

const fail = (res, status, message) => res.status(status).json({ success: false, message });

// The feedback in the URL must belong to the token's user. Others get the same 404 as a
// missing feedback, so other users' IDs cannot be probed.
async function feedbackOwnerMiddleware(req, res, next) {
  const feedbackId = Number(req.params.feedbackId);

  if (!Number.isInteger(feedbackId) || feedbackId <= 0) return fail(res, 400, "Invalid feedback");

  if (!(await FeedbackModel.isReceivedBy(feedbackId, req.user.userId))) {
    return fail(res, 404, "Feedback not found");
  }

  next();
}

export default feedbackOwnerMiddleware;
