import crypto from "crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import UserModel from "../models/UserModel.js";
import httpError from "../utils/httpError.js";

const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_BYTES = 72;
const RESET_TOKEN_MINUTES = 30;

// Compared against when the email is unknown, so login time does not reveal whether an email exists.
// Made fresh from random bytes at startup so it matches no known password; same cost as real hashes.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync(crypto.randomBytes(32).toString("hex"), 10);

class AuthService {
  static validatePassword(password) {
    if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
      throw httpError(400, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
    }

    // bcrypt silently ignores everything after 72 bytes
    if (Buffer.byteLength(password) > MAX_PASSWORD_BYTES) {
      throw httpError(400, `Password must be at most ${MAX_PASSWORD_BYTES} characters`);
    }
  }

  // `ver` must match users.token_version, which logout and password changes raise
  static issueToken(userId, role, version) {
    return jwt.sign({ userId, role, ver: version }, process.env.JWT_SECRET, {
      algorithm: "HS256",
      expiresIn: process.env.JWT_EXPIRES_IN || "1d",
    });
  }

  static async login(email, password) {
    if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
      throw httpError(400, "Email and password are required");
    }

    const user = await UserModel.findByEmail(email.trim());

    // Unknown or unregistered: spend the same time as a real comparison and give one generic
    // error, so neither the message nor the timing reveals whether the email has an account
    if (!user || !user.is_registered || !user.password_hash) {
      await bcrypt.compare(password, user?.password_hash || DUMMY_PASSWORD_HASH);
      throw httpError(401, "Invalid email or password");
    }

    if (!(await bcrypt.compare(password, user.password_hash))) {
      throw httpError(401, "Invalid email or password");
    }

    // Only revealed after the password is proven correct, so it is not an enumeration oracle
    if (!user.is_active) {
      throw httpError(403, "Your account has been deactivated");
    }

    const token = this.issueToken(user.user_id, user.role, user.token_version);

    delete user.password_hash;
    delete user.token_version;

    return { token, user };
  }

  // Never reveals whether the email belongs to an account
  static async forgotPassword(email) {
    if (typeof email !== "string" || !email.trim()) {
      throw httpError(400, "Email is required");
    }

    const user = await UserModel.findByEmail(email.trim());

    if (!user || !user.is_active || !user.is_registered) return;

    const token = crypto.randomBytes(32).toString("hex");

    // Only the hash is stored, so a database leak does not expose usable links
    await UserModel.saveResetToken(user.user_id, this.hashToken(token), RESET_TOKEN_MINUTES);

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;

    // No mail server yet: the link goes to the server console. Email it to user.email later.
    console.log(`\n🔑 Password reset link for ${user.email} (valid ${RESET_TOKEN_MINUTES} minutes):\n${resetLink}\n`);
  }

  static async resetPassword(token, password) {
    if (typeof token !== "string" || !token) {
      throw httpError(400, "Reset token is required");
    }

    this.validatePassword(password);

    const userId = await UserModel.findUserIdByResetToken(this.hashToken(token));

    if (!userId) {
      throw httpError(400, "This reset link is invalid or has expired");
    }

    await UserModel.changePassword(userId, await bcrypt.hash(password, 10));
    await UserModel.deleteResetToken(userId);
  }

  // Other sessions are signed out; the returned token keeps this one alive
  static async changePassword(userId, role, currentPassword, newPassword) {
    if (typeof currentPassword !== "string" || !currentPassword) {
      throw httpError(400, "Current password is required");
    }

    this.validatePassword(newPassword);

    const passwordHash = await UserModel.findPasswordHashById(userId);

    if (!passwordHash || !(await bcrypt.compare(currentPassword, passwordHash))) {
      throw httpError(400, "Current password is incorrect");
    }

    if (newPassword === currentPassword) {
      throw httpError(400, "New password must be different from the current password");
    }

    await UserModel.changePassword(userId, await bcrypt.hash(newPassword, 10));

    // A reset link requested before the change must not be able to undo it
    await UserModel.deleteResetToken(userId);

    // The change raised token_version: this session gets a token with the new one
    const { token_version: version } = await UserModel.findAuthState(userId);

    return this.issueToken(userId, role, version);
  }

  static hashToken(token) {
    return crypto.createHash("sha256").update(token).digest("hex");
  }
}

export default AuthService;
