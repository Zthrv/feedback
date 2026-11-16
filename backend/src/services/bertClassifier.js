import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import EmbeddingService from "./embeddingService.js";
import { splitClauses } from "./clauseSplitter.js";

const here = path.dirname(fileURLToPath(import.meta.url));

const WEIGHTS_PATH =
  process.env.BERT_WEIGHTS ||
  path.join(here, "..", "..", "ml", "model", "weights.json");

const MAX_ATTRIBUTES = 3;

// When two opposite sentiments both carry at least this share of an attribute's evidence,
// the attribute is reported as Neutral (mixed)
const MIXED_SHARE = 0.4;

let weights = null;

/**
 * Load the trained weights once. Returns null if training has not been done yet.
 */
function loadWeights() {

  if (weights) {
    return weights;
  }

  if (!fs.existsSync(WEIGHTS_PATH)) {
    return null;
  }

  weights = JSON.parse(fs.readFileSync(WEIGHTS_PATH, "utf8"));

  return weights;

}

const sigmoid = (x) => 1 / (1 + Math.exp(-x));

function dot(a, b) {

  let sum = 0;

  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i];
  }

  return sum;

}

function softmax(scores) {

  const peak = Math.max(...scores);

  const exps = scores.map((s) => Math.exp(s - peak));

  const total = exps.reduce((a, b) => a + b, 0);

  return exps.map((e) => e / total);

}

class BertClassifier {

  static isAvailable() {
    return loadWeights() !== null;
  }

  /**
   * Override the decision thresholds in memory (used by ml/evaluate.js to compare settings)
   */
  static setThresholds(values) {
    Object.assign(loadWeights().thresholds, values);
  }

  /**
   * Score one clause: how likely is each attribute, and is it Positive, Negative or Neutral?
   */
  static scoreVector(vector) {

    const model = loadWeights();

    const x = vector.map((value, i) => (value - model.mean[i]) / model.std[i]);

    const attributeProbabilities = model.attributes.map(
      (attribute) => sigmoid(dot(attribute.w, x) + attribute.b)
    );

    const sentimentProbabilities = softmax(
      model.sentiment.W.map((row, i) => dot(row, x) + model.sentiment.b[i])
    );

    // How likely is it that this clause is too confusing for BERT (older weights have no such score)
    const complexProbability = model.complexity
      ? sigmoid(dot(model.complexity.w, x) + model.complexity.b)
      : 0;

    return {
      attributeProbabilities,
      sentimentProbabilities,
      complexProbability,
    };

  }

  /**
   * Turn scored clauses into tags (one per attribute, each with its own type).
   * `confident` is false when the model is unsure, so the caller can ask the LLM instead.
   */
  static decide(clauseScores, attributes) {

    const model = loadWeights();

    const {
      attributeThreshold,
      minAttributeScore,
      minSentimentMargin,
      complexThreshold = 1,
      neutralGap = 0.15,
      neutralShare = 0.4,
      neutralScore = 0.3,
    } = model.thresholds;

    const classes = model.sentiment.classes;

    const NEUTRAL = classes.map((name) => (name === "Neutral" ? 1 : 0));

    const evidence = new Map();

    let confident = true;

    for (const scores of clauseScores) {

      const probabilities = scores.attributeProbabilities;

      const top = Math.max(...probabilities);

      // Clauses that match no attribute at all (filler like "thanks!") are ignored
      if (top < minAttributeScore) {
        continue;
      }

      const chosen = probabilities
        .map((p, i) => ({ p, i }))
        .filter((item) => item.p >= attributeThreshold || item.p === top);

      let sentiment = scores.sentimentProbabilities;

      const sorted = [...sentiment].sort((a, b) => b - a);

      // No clear winner. The clause is Neutral when praise and criticism are balanced
      // (both strong and close together) or when Neutral itself scores well.
      // Anything else is left to the LLM.
      if (sorted[0] - sorted[1] < minSentimentMargin) {

        const positive = sentiment[classes.indexOf("Positive")];
        const negative = sentiment[classes.indexOf("Negative")];
        const neutral = sentiment[classes.indexOf("Neutral")];

        const balanced =
          Math.abs(positive - negative) < neutralGap &&
          positive > neutralShare &&
          negative > neutralShare;

        if (balanced || neutral > neutralScore) {
          sentiment = NEUTRAL;
        } else {
          confident = false;
        }

      }

      // Several topics in one clause, sarcasm, implied feedback...: leave these to the LLM
      if (scores.complexProbability >= complexThreshold) {
        confident = false;
      }

      for (const { p, i } of chosen) {

        const entry = evidence.get(i) || { peak: 0, sentiment: [0, 0, 0] };

        entry.peak = Math.max(entry.peak, p);

        sentiment.forEach((s, k) => {
          entry.sentiment[k] += p * s;
        });

        evidence.set(i, entry);

      }

    }

    if (evidence.size === 0) {
      return { tags: [], confident: false };
    }

    const tags = [...evidence.entries()]
      .sort((a, b) => b[1].peak - a[1].peak)
      .slice(0, MAX_ATTRIBUTES)
      .map(([index, entry]) => {

        const total = entry.sentiment.reduce((a, b) => a + b, 0);

        const shares = entry.sentiment.map((s) => s / total);

        const best = shares.indexOf(Math.max(...shares));

        let feedbackType = classes[best];

        const positive = shares[classes.indexOf("Positive")];
        const negative = shares[classes.indexOf("Negative")];

        if (positive >= MIXED_SHARE && negative >= MIXED_SHARE) {
          feedbackType = "Neutral";
        }

        return {
          attribute: attributes.find(
            (candidate) => candidate.attribute_name === model.attributes[index].name
          ),
          feedbackType,
        };

      })
      .filter((tag) => tag.attribute);

    if (tags.length === 0) {
      return { tags: [], confident: false };
    }

    return { tags, confident };

  }

  /**
   * Classify feedback text
   */
  static async classify(text, attributes) {

    const clauses = splitClauses(text);

    const vectors = await EmbeddingService.embed(clauses);

    return this.decide(
      vectors.map((vector) => this.scoreVector(vector)),
      attributes
    );

  }

}

export default BertClassifier;
