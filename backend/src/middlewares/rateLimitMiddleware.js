import rateLimit, { ipKeyGenerator } from "express-rate-limit";

const FIFTEEN_MINUTES = 15 * 60 * 1000;

function limiter(options) {
  return rateLimit({
    windowMs: FIFTEEN_MINUTES,
    standardHeaders: true,
    legacyHeaders: false,
    ...options,
    message: { success: false, message: options.message },
  });
}

// Count per account and IP, so one person's failed attempts never lock out others on the same network
function accountKey(req) {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";

  return `${ipKeyGenerator(req.ip)}|${email}`;
}

const userKey = (req) => `user:${req.user.userId}`;

// Login: 10 failed attempts per account
const loginLimiter = limiter({
  limit: 10,
  skipSuccessfulRequests: true,
  keyGenerator: accountKey,
  message: "Too many failed login attempts for this account. Please try again in 15 minutes.",
});

// Login: higher cap per IP, only to stop one machine trying a few passwords on every account
const loginIpLimiter = limiter({
  limit: 100,
  skipSuccessfulRequests: true,
  message: "Too many failed login attempts. Please try again in 15 minutes.",
});

// Forgot password: 5 requests per account
const forgotPasswordLimiter = limiter({
  limit: 5,
  keyGenerator: accountKey,
  message: "Too many password reset requests for this account. Please try again in 15 minutes.",
});

// Reset password: 10 failed attempts per IP
const resetPasswordLimiter = limiter({
  limit: 10,
  skipSuccessfulRequests: true,
  message: "Too many attempts. Please try again in 15 minutes.",
});

// Change password: 5 failed attempts per user, so a stolen session cannot guess the current password
const changePasswordLimiter = limiter({
  limit: 5,
  skipSuccessfulRequests: true,
  keyGenerator: userKey,
  message: "Too many failed attempts. Please try again in 15 minutes.",
});

// Sending feedback: 30 per user, so one account cannot flood a colleague or the classifier
const feedbackLimiter = limiter({
  limit: 30,
  keyGenerator: userKey,
  message: "You have sent a lot of feedback in a short time. Please try again in 15 minutes.",
});

// Every authenticated endpoint: 20 requests per user, per endpoint, per minute.
// Attach on the route itself so req.route is set: the key uses the route pattern, so changing
// the ID in the URL does not reset the count. Lower-cased because Express paths are case-insensitive.
const userEndpointLimiter = limiter({
  windowMs: 60 * 1000,
  limit: 20,
  keyGenerator: (req) =>
    `user:${req.user.userId}|${req.method} ${req.baseUrl}${req.route?.path ?? req.path}`.toLowerCase(),
  message: "Too many requests. Please wait a minute and try again.",
});

// Everything, per IP: a ceiling for floods, including the endpoints that need no login
const globalLimiter = limiter({
  windowMs: 60 * 1000,
  limit: 600,
  message: "Too many requests. Please slow down.",
});

export {
  globalLimiter,
  userEndpointLimiter,
  feedbackLimiter,
  loginLimiter,
  loginIpLimiter,
  forgotPasswordLimiter,
  resetPasswordLimiter,
  changePasswordLimiter,
};
