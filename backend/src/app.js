import express from "express";
import cors from "cors";
import helmet from "helmet";

import dashboardRoutes from "./routes/dashboardRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import feedbackRoutes from "./routes/feedbackRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import healthRoutes from "./routes/healthRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import { globalLimiter } from "./middlewares/rateLimitMiddleware.js";
import { notFound, errorHandler } from "./middlewares/errorMiddleware.js";

const app = express();

// CORS_ORIGINS=http://localhost:5173,http://192.168.1.5:5173 limits which sites may call
// the API. Left unset, any origin is allowed (development only).
const origins = (process.env.CORS_ORIGINS || "").split(",").map((o) => o.trim()).filter(Boolean);

app.disable("x-powered-by");

// Security headers. This server only sends JSON, so nothing may be loaded or framed.
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"], baseUri: ["'none'"], formAction: ["'none'"] },
  },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  referrerPolicy: { policy: "no-referrer" },
  frameguard: { action: "deny" },
}));

app.use((req, res, next) => {
  // Feedback and tokens must never sit in a browser or proxy cache
  res.set("Cache-Control", "no-store");
  res.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  next();
});

app.use(cors({
  origin: origins.length > 0 ? origins : true,
  methods: ["GET", "POST", "PUT"],
  allowedHeaders: ["Content-Type", "Authorization"],
  maxAge: 600,
}));

app.use(globalLimiter);

// The largest real request is a 500-character feedback, so bodies stay small
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: false, limit: "10kb" }));

app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/health", healthRoutes);
app.use("/api/admin", adminRoutes);

app.get("/", (req, res) => {
  res.json({ success: true, message: "Feedback System Backend Running 🚀" });
});

app.use(notFound);
app.use(errorHandler);

export default app;
