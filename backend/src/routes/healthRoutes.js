import express from "express";

import pool from "../config/database.js";
import ExplicitFilter from "../services/explicitFilter.js";
import AbuseVectors from "../services/abuseVectors.js";
import ClassificationQueue from "../services/classificationQueue.js";

const router = express.Router();

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";

/**
 * One place to see whether every part the system depends on is up.
 * Shows status only: no feedback, user or configuration details.
 */
router.get("/", async (req, res) => {

  let database = false;

  let waiting = null;

  try {

    const [rows] = await pool.query(
      `
      SELECT
        SUM(classification_status = 'pending') AS pending,
        SUM(review_status = 'requested') AS reviews,
        SUM(abuse_status = 'requested') AS abuse,
        SUM(irrelevant_status = 'requested') AS irrelevant
      FROM feedback
      `
    );

    database = true;

    waiting = {
      classification: Number(rows[0].pending) || 0,
      reReview: Number(rows[0].reviews) || 0,
      abuseReports: Number(rows[0].abuse) || 0,
      irrelevantReports: Number(rows[0].irrelevant) || 0,
    };

  } catch (error) {
    console.error(`Health check: database failed: ${error.message}`);
  }

  let llm = false;

  try {
    llm = (await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(2000) })).ok;
  } catch {
    llm = false;
  }

  return res.status(database ? 200 : 503).json({
    success: database,
    data: {
      database,
      llm,
      bertLanguageCheck: ExplicitFilter.isReady(),
      bertAbuseVectors: AbuseVectors.isReady(),
      bertAttributeClassifier: ClassificationQueue.canUseBert(),
      waiting,
    },
  });

});

export default router;
