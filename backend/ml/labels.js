import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));

const ATTRIBUTES = [
  "Leadership", "Productivity", "Work Quality", "Teamwork", "Reliability",
  "Communication", "Innovation", "Adaptability", "Accountability", "Time Management",
];

const SENTIMENTS = ["Positive", "Negative", "Neutral"];

/**
 * Fixed train/test split: about one clause in five is held back for measuring accuracy
 */
function splitFor(text) {

  let hash = 5381;

  for (const char of text) {
    hash = (hash * 33 + char.charCodeAt(0)) >>> 0;
  }

  return hash % 5 === 0 ? "test" : "train";

}

/**
 * Minimal CSV reader (quoted fields, doubled quotes, embedded commas)
 */
function parseCsv(text) {

  const rows = [];

  let row = [];
  let field = "";
  let quoted = false;

  const input = text.replace(/^﻿/, "");

  for (let i = 0; i < input.length; i++) {

    const char = input[i];

    if (quoted) {

      if (char === '"' && input[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }

    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {

      if (char === "\r" && input[i + 1] === "\n") {
        i++;
      }

      row.push(field);
      field = "";

      if (row.some((value) => value !== "")) {
        rows.push(row);
      }

      row = [];

    } else {
      field += char;
    }

  }

  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;

}

/**
 * Read labels.csv and group the rows by clause.
 * A clause can carry several attributes, each with its own sentiment.
 * A row whose attribute is "None" marks a clause that matches no attribute.
 */
function readLabels(file = path.join(here, "labels.csv")) {

  const [header, ...rows] = parseCsv(fs.readFileSync(file, "utf8"));

  const column = (name) => header.indexOf(name);

  const byClause = new Map();

  const complexColumn = column("complex");

  let skipped = 0;

  for (const row of rows) {

    const clause = row[column("clause")].trim();

    const attribute = row[column("attribute")].trim();

    const sentiment = row[column("sentiment")].trim();

    if (!attribute) {
      skipped++;
      continue;
    }

    if (attribute !== "None" && !ATTRIBUTES.includes(attribute)) {
      throw new Error(`Unknown attribute "${attribute}" for clause "${clause}"`);
    }

    if (attribute !== "None" && !SENTIMENTS.includes(sentiment)) {
      throw new Error(`Sentiment must be Positive, Negative or Neutral for "${clause}" (got "${sentiment}")`);
    }

    if (!byClause.has(clause)) {
      byClause.set(clause, { clause, split: row[column("split")], source: row[column("source")], explicitComplex: false, labels: [] });
    }

    if (complexColumn > -1 && row[complexColumn].trim().toLowerCase() === "yes") {
      byClause.get(clause).explicitComplex = true;
    }

    if (attribute !== "None") {
      byClause.get(clause).labels.push({ attribute, sentiment });
    }

  }

  // A clause is "complex" if it is marked so, or if a person-checked row covers two or more
  // attributes at once: those are the ones BERT should hand to the LLM.
  // (Unreviewed LLM suggestions with two attributes are mostly over-tagging, so they do not count.)
  const clauses = [...byClause.values()].map((c) => ({
    ...c,
    complex: c.explicitComplex || (c.labels.length >= 2 && c.source !== "llm"),
  }));

  return { clauses, skipped };

}

export { readLabels, parseCsv, splitFor, ATTRIBUTES, SENTIMENTS };
