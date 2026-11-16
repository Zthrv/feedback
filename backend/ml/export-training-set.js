/**
 * Builds backend/ml/labels.csv: every distinct clause of the existing feedback,
 * with a suggested attribute and sentiment for a person to check and correct.
 *
 * Suggestions come from the local LLM, asked about each clause on its own.
 *
 * Run from the backend folder:  node ml/export-training-set.js
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import pool from "../src/config/database.js";
import FeedbackModel from "../src/models/FeedbackModel.js";
import ClassificationService from "../src/services/classificationService.js";
import { splitClauses } from "../src/services/clauseSplitter.js";

const here = path.dirname(fileURLToPath(import.meta.url));

// labels.csv holds hand-checked work, so it is never overwritten by accident
if (fs.existsSync(path.join(here, "labels.csv")) && !process.argv.includes("--force")) {
  console.log("ml/labels.csv already exists and may contain reviewed labels. Re-run with --force to replace it.");
  process.exit(1);
}

const attributes = await FeedbackModel.getAttributes();

const [feedback] = await pool.query(
  "SELECT feedback_id, feedback_text FROM feedback ORDER BY feedback_id"
);

// One row per distinct clause (the same sample text was sent to several people)
const seen = new Set();

const clauses = [];

for (const row of feedback) {

  const parts = splitClauses(row.feedback_text);

  for (const clause of parts) {

    const key = clause.toLowerCase();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);

    clauses.push({
      feedbackId: row.feedback_id,
      clause,
    });

  }

}

// Fixed test split: about one clause in five is held back for measuring accuracy
function splitFor(text) {

  let hash = 5381;

  for (const char of text) {
    hash = (hash * 33 + char.charCodeAt(0)) >>> 0;
  }

  return hash % 5 === 0 ? "test" : "train";

}

const rows = [];

console.log(`${feedback.length} feedback entries -> ${clauses.length} distinct clauses`);

let done = 0;

for (const item of clauses) {

  const split = splitFor(item.clause);

  let tags = [];

  try {
    tags = await ClassificationService.classifyAttributes("", item.clause, attributes);
  } catch (error) {
    console.log(`  LLM failed for "${item.clause.slice(0, 40)}...": ${error.message}`);
  }

  if (tags.length === 0) {
    rows.push({ split, feedbackId: item.feedbackId, clause: item.clause, attribute: "", sentiment: "", source: "llm" });
  }

  for (const tag of tags) {
    rows.push({
      split,
      feedbackId: item.feedbackId,
      clause: item.clause,
      attribute: tag.attribute.attribute_name,
      sentiment: tag.feedbackType,
      source: "llm",
    });
  }

  done++;

  if (done % 50 === 0) {
    console.log(`  ${done}/${clauses.length}`);
  }

}

const quote = (value) => `"${String(value).replace(/"/g, '""')}"`;

const header = ["id", "split", "feedback_id", "clause", "attribute", "sentiment", "source", "complex"];

const lines = rows.map((row, index) =>
  [index + 1, row.split, row.feedbackId, row.clause, row.attribute, row.sentiment, row.source, ""]
    .map(quote)
    .join(",")
);

// The byte-order mark makes Excel open the file as UTF-8
fs.writeFileSync(
  path.join(here, "labels.csv"),
  "﻿" + [header.join(","), ...lines].join("\r\n") + "\r\n",
  "utf8"
);

const count = (key, value) => rows.filter((row) => row[key] === value).length;

console.log(`\nwrote ml/labels.csv: ${rows.length} rows`);
console.log(`  train ${count("split", "train")}, test ${count("split", "test")}`);

const perAttribute = attributes
  .map((a) => `${a.attribute_name} ${rows.filter((row) => row.attribute === a.attribute_name).length}`)
  .join(", ");

console.log(`  rows per attribute: ${perAttribute}`);

await pool.end();
