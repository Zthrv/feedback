import dotenv from "dotenv";
import app from "./app.js";
import pool from "./config/database.js";
import ClassificationQueue from "./services/classificationQueue.js";
import ExplicitFilter from "./services/explicitFilter.js";
import EmbeddingService from "./services/embeddingService.js";

dotenv.config({ quiet: true });

const PORT = process.env.PORT || 5000;

// Tokens signed with a missing or short secret could be forged
if ((process.env.JWT_SECRET || "").length < 32) {
  console.error("❌ JWT_SECRET must be set and at least 32 characters long");
  process.exit(1);
}

try {
  (await pool.getConnection()).release();
  console.log("✅ MySQL Database Connected Successfully");
} catch (error) {
  console.error(`❌ Database Connection Failed\n${error.message}`);
  process.exit(1);
}

// Load the BERT models before taking requests' feedback through them.
// Until they are ready, submissions are checked by the LLM in the background instead.
Promise.all([ExplicitFilter.warmUp(), EmbeddingService.warmUp()])
  .then(() => console.log("✅ Language models ready"))
  .catch((error) => console.error(`BERT models could not be loaded, the LLM will be used: ${error.message}`));

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);

  // Pick up feedback left pending by a restart or an LLM outage
  ClassificationQueue.start();
});
