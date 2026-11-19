import bcrypt from "bcrypt";

import UserModel from "../models/UserModel.js";
import FeedbackModel from "../models/FeedbackModel.js";
import AuthService from "../services/authService.js";
import { ROLES } from "../middlewares/roleMiddleware.js";
import httpError from "../utils/httpError.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Column sizes from databases/schema.sql
const LIMITS = { fullName: 100, email: 150, department: 100, designation: 100 };

// Same limits the LLM works within (classificationService.js)
const MAX_TAGS = 3;
const FEEDBACK_TYPES = ["Positive", "Negative", "Neutral"];

const text = (value) => (typeof value === "string" ? value.trim() : "");

// A positive whole number from the query string, or the fallback when it is missing
function positiveInt(value, fallback, name) {
  if (value === undefined) return fallback;

  const number = Number(value);

  if (!Number.isInteger(number) || number <= 0) throw httpError(400, `Invalid ${name}`);

  return number;
}

class AdminController {

  // Create an account with a starting password the employee can change later.
  // The employee ID is generated here, never typed in.
  static async createUser(req, res) {
    const user = {
      fullName: text(req.body?.fullName),
      email: text(req.body?.email).toLowerCase(),
      department: text(req.body?.department) || null,
      designation: text(req.body?.designation) || null,
      role: req.body?.role || ROLES.EMPLOYEE,
    };

    const password = req.body?.password;

    if (!user.fullName || !user.email) {
      throw httpError(400, "Full name and email are required");
    }

    for (const [field, max] of Object.entries(LIMITS)) {
      if (user[field] && user[field].length > max) {
        throw httpError(400, `${field} can be at most ${max} characters`);
      }
    }

    if (!EMAIL_PATTERN.test(user.email)) throw httpError(400, "Enter a valid email address");

    if (!Object.values(ROLES).includes(user.role)) {
      throw httpError(400, "Role must be Employee or Admin");
    }

    AuthService.validatePassword(password);

    const passwordHash = await bcrypt.hash(password, 10);

    let userId;

    // Two admins saving at the same moment can be given the same ID: the second one tries again
    for (let attempt = 1; !userId; attempt++) {
      try {
        userId = await UserModel.create({ ...user, passwordHash });
      } catch (error) {
        if (error.code !== "ER_DUP_ENTRY") throw error;

        if (error.message.includes("email")) {
          throw httpError(409, "An account with this email already exists");
        }

        if (attempt === 3) throw error;
      }
    }

    res.status(201).json({
      success: true,
      message: "Account created",
      data: {
        ...(await UserModel.findById(userId)),
        employee_id: await UserModel.getEmployeeId(userId),
      },
    });
  }

  // Everyone's delivered feedback, read-only. Senders are erased on delivery,
  // so the admin cannot see who wrote anything either.
  static async listAllFeedback(req, res) {
    res.json({
      success: true,
      data: await FeedbackModel.getAll({
        page: positiveInt(req.query.page, 1, "page"),
        receiverId: positiveInt(req.query.receiverId, null, "recipient"),
      }),
    });
  }

  // Feedback that was blocked or removed as abusive, read-only
  static async listAbuseLog(req, res) {
    res.json({
      success: true,
      data: await FeedbackModel.getAbuseLog({
        page: positiveInt(req.query.page, 1, "page"),
        receiverId: positiveInt(req.query.receiverId, null, "recipient"),
      }),
    });
  }

  // Feedback reported as irrelevant, waiting for a decision
  static async listIrrelevantReports(req, res) {
    res.json({ success: true, data: await FeedbackModel.getIrrelevantReports() });
  }

  // The admin's decision is final: "remove" deletes the feedback, "keep" leaves it
  static async resolveIrrelevantReport(req, res) {
    const feedbackId = positiveInt(req.params.feedbackId, null, "feedback");
    const decision = req.body?.decision;

    if (!["remove", "keep"].includes(decision)) {
      throw httpError(400, "Decision must be remove or keep");
    }

    const report = await FeedbackModel.findIrrelevantRequested(feedbackId);

    if (!report) throw httpError(404, "This report does not exist or has already been decided");

    // An admin cannot judge a report they made themselves
    if (report.receiver_id === req.user.userId) {
      throw httpError(403, "Another admin must review a report you made yourself");
    }

    const done = decision === "remove"
      ? await FeedbackModel.removeAsIrrelevant(feedbackId)
      : await FeedbackModel.finishIrrelevantCheck(feedbackId);

    if (!done) throw httpError(409, "This report has already been decided");

    res.json({ success: true, message: decision === "remove" ? "Feedback removed" : "Feedback kept" });
  }

  // Feedback the LLM could not classify in time, with the attributes the admin can tag it with
  static async listUnclassified(req, res) {
    res.json({
      success: true,
      data: {
        items: await FeedbackModel.getUnclassified(req.user.userId),
        attributes: await FeedbackModel.getAttributes(),
      },
    });
  }

  // The admin decides instead of the LLM, once:
  //   { decision: "deliver", tags: [{ attributeId, feedbackType }, ...] }  1 to 3 tags
  //   { decision: "remove" }  never delivered, logged, counted as bounced for the sender
  static async resolveUnclassified(req, res) {
    const feedbackId = positiveInt(req.params.feedbackId, null, "feedback");
    const decision = req.body?.decision;

    if (!["deliver", "remove"].includes(decision)) {
      throw httpError(400, "Decision must be deliver or remove");
    }

    const feedback = await FeedbackModel.findUnclassified(feedbackId, req.user.userId);

    if (!feedback) throw httpError(404, "This feedback does not exist or has already been decided");

    // Deciding on feedback addressed to yourself would let you read or bin it before delivery
    if (feedback.receiver_id === req.user.userId) {
      throw httpError(403, "Another admin must decide on feedback sent to you");
    }

    // Delivering your own feedback would skip the language check it never finished.
    // sender_id cannot change while the feedback waits here, so this cannot be raced.
    if (feedback.sent_by_me) {
      throw httpError(403, "Another admin must decide on feedback you sent");
    }

    let done;

    if (decision === "remove") {
      done = await FeedbackModel.removeUnclassified(feedbackId);
    } else {
      const tags = await AdminController.readTags(req.body?.tags);
      done = await FeedbackModel.saveTags(feedbackId, tags, "admin", "admin");
    }

    if (!done) throw httpError(409, "This feedback has already been decided");

    res.json({ success: true, message: decision === "remove" ? "Feedback removed" : "Feedback delivered" });
  }

  // The admin's tags, checked the same way as the LLM's: 1 to 3 known attributes, each once
  static async readTags(input) {
    if (!Array.isArray(input) || input.length < 1 || input.length > MAX_TAGS) {
      throw httpError(400, `Choose between 1 and ${MAX_TAGS} attributes`);
    }

    const attributes = await FeedbackModel.getAttributes();

    const tags = input.map((tag) => ({
      attribute: attributes.find((a) => a.attribute_id === tag?.attributeId),
      feedbackType: tag?.feedbackType,
    }));

    if (tags.some((tag) => !tag.attribute || !FEEDBACK_TYPES.includes(tag.feedbackType))) {
      throw httpError(400, "Each attribute needs a valid name and type (Positive, Negative or Neutral)");
    }

    if (new Set(tags.map((tag) => tag.attribute.attribute_id)).size !== tags.length) {
      throw httpError(400, "Each attribute can be chosen only once");
    }

    return tags;
  }

}

export default AdminController;
