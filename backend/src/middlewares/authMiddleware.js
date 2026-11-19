import jwt from "jsonwebtoken";

import UserModel from "../models/UserModel.js";

const unauthorized = (res, message) => res.status(401).json({ success: false, message });

async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return unauthorized(res, "No token provided");
  }

  let payload;

  try {
    payload = jwt.verify(authHeader.split(" ")[1], process.env.JWT_SECRET, { algorithms: ["HS256"] });
  } catch {
    return unauthorized(res, "Invalid or expired token");
  }

  const user = await UserModel.findAuthState(payload.userId);

  // Deactivated or deleted accounts lose access immediately
  if (!user || !user.is_active) return unauthorized(res, "Invalid or expired token");

  // Logout and password changes raise token_version, so every older token stops working.
  // A counter, not a time: a token issued in the same second as a logout is still rejected.
  if (payload.ver !== user.token_version) {
    const passwordChanged = user.password_changed_at && payload.iat <= user.password_changed_at;

    return unauthorized(res, passwordChanged ? "Your password was changed. Please log in again." : "Invalid or expired token");
  }

  req.user = { userId: payload.userId, role: user.role };

  next();
}

export default authMiddleware;
