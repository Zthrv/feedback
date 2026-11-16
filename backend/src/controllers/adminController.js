import bcrypt from "bcrypt";

import UserModel from "../models/UserModel.js";
import FeedbackModel from "../models/FeedbackModel.js";
import AuthService from "../services/authService.js";
import { ROLES } from "../middlewares/roleMiddleware.js";
import httpError from "../utils/httpError.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Column sizes from databases/schema.sql
const LIMITS = { fullName: 100, email: 150, department: 100, designation: 100 };

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

}

export default AdminController;
