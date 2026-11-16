import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import EmbeddingService from "./embeddingService.js";
import { splitClauses } from "./clauseSplitter.js";

const here = path.dirname(fileURLToPath(import.meta.url));

const VECTORS_PATH =
  process.env.ABUSE_VECTORS ||
  path.join(here, "..", "..", "ml", "model", "abuse-vectors.json");

// A clause is compared with the example vectors of every abuse type and with the clean ones.
// Its score for a type is how close it is to that type's nearest examples (0 to 1), and its
// margin is how much closer that is than its nearest clean examples.
// At or above BLOCK it is explicit, at or above REVIEW the LLM decides, and below that it is clean.
// The margin matters most: on the project's own clean feedback (about 690 clauses) no margin
// went above 0.09, while abuse the check had never seen mostly scored 0.15 to 0.45.
const BLOCK_SCORE = Number(process.env.ABUSE_BLOCK || 0.58);
const BLOCK_MARGIN = Number(process.env.ABUSE_BLOCK_MARGIN || 0.22);
const REVIEW_SCORE = Number(process.env.ABUSE_REVIEW || 0.4);
const REVIEW_MARGIN = Number(process.env.ABUSE_REVIEW_MARGIN || 0.06);

// How many of the nearest examples are averaged, so one odd example cannot decide alone
const NEAREST = 2;

let vectors = null;

/**
 * Load the example vectors once. Returns null if ml/train-abuse.js has not been run yet.
 */
function loadVectors() {

  if (vectors) {
    return vectors;
  }

  if (!fs.existsSync(VECTORS_PATH)) {
    return null;
  }

  vectors = JSON.parse(fs.readFileSync(VECTORS_PATH, "utf8"));

  return vectors;

}

function dot(a, b) {

  let sum = 0;

  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i];
  }

  return sum;

}

/**
 * How close a vector is to a group of examples: the average of its nearest few
 */
function closeness(vector, examples) {

  const nearest = examples
    .map((example) => dot(vector, example))
    .sort((a, b) => b - a)
    .slice(0, NEAREST);

  return nearest.reduce((a, b) => a + b, 0) / nearest.length;

}

class AbuseVectors {

  static isAvailable() {
    return loadVectors() !== null;
  }

  /**
   * Usable once the examples are trained and the embedding model has finished loading
   */
  static isReady() {
    return this.isAvailable() && EmbeddingService.isReady();
  }

  /**
   * Compare one clause vector with every abuse type.
   * Returns the type it is closest to, that score, and its margin over the clean examples.
   */
  static scoreVector(vector) {

    const model = loadVectors();

    const clean = closeness(vector, model.clean);

    let best = { category: null, score: 0 };

    for (const [category, examples] of Object.entries(model.abuse)) {

      const score = closeness(vector, examples);

      if (score > best.score) {
        best = { category, score };
      }

    }

    return { ...best, margin: best.score - clean };

  }

  /**
   * Turn one clause's score into "explicit", "unsure" (the LLM should decide) or "clean"
   */
  static judge({ score, margin }) {

    if (score >= BLOCK_SCORE && margin >= BLOCK_MARGIN) {
      return "explicit";
    }

    if (score >= REVIEW_SCORE && margin >= REVIEW_MARGIN) {
      return "unsure";
    }

    return "clean";

  }

  /**
   * Check a feedback clause by clause; the worst clause decides.
   * Returns { verdict, category, score, margin, clause } for that clause.
   */
  static async check(title, text) {

    // The title is judged on its own: joined to the first clause it would blur that clause
    const clauses = [title, ...splitClauses(text)].filter((clause) => clause.trim());

    const clauseVectors = await EmbeddingService.embed(clauses);

    const rank = { clean: 0, unsure: 1, explicit: 2 };

    let worst = { verdict: "clean", category: null, score: 0, margin: 0, clause: null };

    clauseVectors.forEach((vector, i) => {

      const scores = this.scoreVector(vector);

      const verdict = this.judge(scores);

      if (
        rank[verdict] > rank[worst.verdict] ||
        (rank[verdict] === rank[worst.verdict] && scores.score > worst.score)
      ) {
        worst = { verdict, ...scores, clause: clauses[i] };
      }

    });

    return worst;

  }

}

export default AbuseVectors;
