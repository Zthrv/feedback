/**
 * Trains the BERT classifier from backend/ml/labels.csv and writes the weights.
 *
 * Three small "heads" are trained on top of the sentence embeddings:
 *   1. attribute head:  for each of the ten attributes, a yes/no score (logistic regression)
 *   2. sentiment head:  Positive / Negative / Neutral (softmax regression)
 *   3. complexity head: "is this clause too confusing for BERT?" (logistic regression).
 *      Clauses it flags are handed to the LLM. It learns from the rows marked complex = yes
 *      (several topics in one clause, sarcasm, double negatives, implied feedback...).
 *
 * Only rows that a person wrote or checked are used (source = seed or authored).
 * Unreviewed LLM suggestions are left out unless you pass --include-llm.
 *
 * Run from the backend folder:
 *   node ml/train.js                       writes ml/model/weights.json (used by the server)
 *   node ml/train.js --out ml/model/x.json writes somewhere else (e.g. a dry run)
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import EmbeddingService from "../src/services/embeddingService.js";
import { readLabels, ATTRIBUTES, SENTIMENTS } from "./labels.js";

const here = path.dirname(fileURLToPath(import.meta.url));

const outIndex = process.argv.indexOf("--out");

const outPath = outIndex > -1
  ? path.resolve(process.argv[outIndex + 1])
  : path.join(here, "model", "weights.json");

const includeLlm = process.argv.includes("--include-llm");

const EPOCHS = 600;
const LEARNING_RATE = 0.2;
const L2 = 0.02;

const { clauses: allClauses, skipped } = readLabels();

if (skipped > 0) {
  console.log(`skipped ${skipped} rows with no attribute filled in`);
}

const clauses = allClauses.filter((c) => includeLlm || c.source !== "llm");

console.log(`using ${clauses.length} of ${allClauses.length} clauses` +
  (includeLlm ? " (including unreviewed LLM rows)" : " (person-written or person-checked only)"));

const train = clauses.filter((c) => c.split === "train");
const test = clauses.filter((c) => c.split === "test");

console.log(`${train.length} to train on, ${test.length} held out; ` +
  `${train.filter((c) => c.complex).length} of the training clauses are complex`);

// ---- embeddings ----
const vectors = [];

for (let i = 0; i < clauses.length; i += 32) {
  vectors.push(...(await EmbeddingService.embed(clauses.slice(i, i + 32).map((c) => c.clause))));
}

clauses.forEach((c, i) => { c.vector = vectors[i]; });

const dim = vectors[0].length;

// Standardise every dimension using the training clauses only
const mean = new Array(dim).fill(0);
const std = new Array(dim).fill(0);

for (const c of train) {
  c.vector.forEach((v, i) => { mean[i] += v / train.length; });
}

for (const c of train) {
  c.vector.forEach((v, i) => { std[i] += (v - mean[i]) ** 2 / train.length; });
}

std.forEach((v, i) => { std[i] = Math.sqrt(v) || 1; });

train.forEach((c) => { c.x = c.vector.map((v, i) => (v - mean[i]) / std[i]); });

const sigmoid = (z) => 1 / (1 + Math.exp(-z));

const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);

/**
 * Yes/no classifier by gradient descent. Rare "yes" examples count for more so they are not drowned out.
 */
function trainYesNo(y) {

  const w = new Array(dim).fill(0);

  let b = 0;

  const positives = y.reduce((a, v) => a + v, 0);

  const positiveWeight = positives > 0 ? Math.min(5, (train.length - positives) / positives) : 1;

  for (let epoch = 0; epoch < EPOCHS; epoch++) {

    const gradient = new Array(dim).fill(0);

    let biasGradient = 0;

    train.forEach((c, n) => {

      const error = (sigmoid(dot(w, c.x) + b) - y[n]) * (y[n] ? positiveWeight : 1);

      c.x.forEach((v, i) => { gradient[i] += error * v; });

      biasGradient += error;

    });

    for (let i = 0; i < dim; i++) {
      w[i] -= LEARNING_RATE * (gradient[i] / train.length + L2 * w[i]);
    }

    b -= LEARNING_RATE * (biasGradient / train.length);

  }

  return { w, b, examples: positives };

}

// ---- attribute head ----
const attributes = ATTRIBUTES.map((name) => ({
  name,
  ...trainYesNo(train.map((c) => (c.labels.some((l) => l.attribute === name) ? 1 : 0))),
}));

// ---- complexity head ----
const complexity = trainYesNo(train.map((c) => (c.complex ? 1 : 0)));

// ---- sentiment head ----
const rows = train.flatMap((c) =>
  c.labels.map((l) => ({ x: c.x, k: SENTIMENTS.indexOf(l.sentiment) }))
);

const W = SENTIMENTS.map(() => new Array(dim).fill(0));
const B = SENTIMENTS.map(() => 0);

const counts = SENTIMENTS.map((_, k) => rows.filter((r) => r.k === k).length);

const classWeight = counts.map((n) => (n > 0 ? rows.length / (SENTIMENTS.length * n) : 0));

for (let epoch = 0; epoch < EPOCHS; epoch++) {

  const gradient = SENTIMENTS.map(() => new Array(dim).fill(0));
  const biasGradient = SENTIMENTS.map(() => 0);

  for (const row of rows) {

    const scores = W.map((wk, k) => dot(wk, row.x) + B[k]);

    const peak = Math.max(...scores);

    const exps = scores.map((s) => Math.exp(s - peak));

    const total = exps.reduce((a, v) => a + v, 0);

    SENTIMENTS.forEach((_, k) => {

      const error = (exps[k] / total - (row.k === k ? 1 : 0)) * classWeight[row.k];

      row.x.forEach((v, i) => { gradient[k][i] += error * v; });

      biasGradient[k] += error;

    });

  }

  SENTIMENTS.forEach((_, k) => {

    for (let i = 0; i < dim; i++) {
      W[k][i] -= LEARNING_RATE * (gradient[k][i] / rows.length + L2 * W[k][i]);
    }

    B[k] -= LEARNING_RATE * (biasGradient[k] / rows.length);

  });

}

const weights = {
  version: 2,
  trainedAt: new Date().toISOString(),
  embeddingModel: process.env.EMBEDDING_MODEL || "Xenova/all-MiniLM-L6-v2",
  dim,
  mean,
  std,
  attributes: attributes.map(({ name, w, b }) => ({ name, w, b })),
  sentiment: { classes: SENTIMENTS, W, b: B },
  complexity: { w: complexity.w, b: complexity.b },
  // Chosen with ml/evaluate.js: at these values the hybrid (BERT when sure, else the LLM)
  // matched or beat the LLM alone on the held-out clauses and on whole multi-attribute feedback.
  // Raise minSentimentMargin to send more feedback to the LLM; lower it to let BERT handle more.
  thresholds: {
    attributeThreshold: 0.5,
    minAttributeScore: 0.3,
    minSentimentMargin: 0.3,
    complexThreshold: 0.5,
    // When no sentiment wins by minSentimentMargin, the clause is still called Neutral if
    // Positive and Negative are both above neutralShare and within neutralGap of each other,
    // or if Neutral itself scores above neutralScore. Otherwise the LLM decides.
    neutralGap: 0.15,
    neutralShare: 0.4,
    neutralScore: 0.3,
  },
  trainedOn: {
    clauses: train.length,
    complexClauses: complexity.examples,
    sentimentRows: rows.length,
    includedLlmRows: includeLlm,
    examplesPerAttribute: Object.fromEntries(attributes.map((a) => [a.name, a.examples])),
  },
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });

fs.writeFileSync(outPath, JSON.stringify(weights));

console.log(`\nwrote ${path.relative(process.cwd(), outPath)} (${Math.round(fs.statSync(outPath).size / 1024)} KB)`);
console.log("training clauses per attribute:", attributes.map((a) => `${a.name} ${a.examples}`).join(", "));
console.log("Now run:  node ml/evaluate.js" + (outIndex > -1 ? ` --weights ${process.argv[outIndex + 1]}` : ""));

process.exit(0);
