import { lazyPipeline } from "./modelRuntime.js";
import ClassificationService from "./classificationService.js";
import WordFilter from "./wordFilter.js";
import AbuseVectors from "./abuseVectors.js";

const TOXICITY_MODEL = process.env.TOXICITY_MODEL || "Xenova/toxic-bert";

// toxic-bert gives six scores (0 to 1). The five specific ones are precise, so each can
// reject on its own. The general "toxic" score also fires on harsh but fair criticism
// ("your code is garbage" scores 0.9), so it never rejects: it only sends the text to the LLM.
const BLOCK_AT = {
  severe_toxic: Number(process.env.TOXICITY_BLOCK_SEVERE || 0.5),
  threat: Number(process.env.TOXICITY_BLOCK_THREAT || 0.5),
  identity_hate: Number(process.env.TOXICITY_BLOCK_IDENTITY || 0.5),
  insult: Number(process.env.TOXICITY_BLOCK_INSULT || 0.85),
  obscene: Number(process.env.TOXICITY_BLOCK_OBSCENE || 0.85),
};

// Any score at or above this is a grey zone for the LLM
const REVIEW_SCORE = Number(process.env.TOXICITY_ALLOW || 0.4);

// Model label -> the category stored in the abuse log
const CATEGORY = {
  severe_toxic: "toxic",
  threat: "threat",
  identity_hate: "identity",
  insult: "insult",
  obscene: "obscene",
};

const CHUNK_LENGTH = 1200;

// Undo tricks that hide a word from the checks: invisible characters inside it
// ("fu<zero-width space>ck") and look-alike letter forms (full-width, styled letters)
const HIDDEN = /[­​-‏‪-‮⁠-⁤﻿]/g;
const plain = (value) => value.normalize("NFKC").replace(HIDDEN, "");

// The 8-bit quantized model: same decisions as the full one in under half the time
const toxicity = lazyPipeline("text-classification", TOXICITY_MODEL, { dtype: "q8" });

class ExplicitFilter {

  // CLASSIFIER=llm switches the BERT models off
  static get llmOnly() {
    return (process.env.CLASSIFIER || "hybrid") === "llm";
  }

  // Load the model and run it once, so the first feedback is not slow
  static async warmUp() {
    if (this.llmOnly) return;
    const model = await toxicity.load();
    await model("warm up", { top_k: null });
  }

  static isReady() {
    return toxicity.isReady();
  }

  // All six scores, each the highest across the text (long text is read in pieces)
  static async toxicityScores(text) {
    const model = await toxicity.load();
    const scores = {};

    for (let start = 0; start < text.length; start += CHUNK_LENGTH) {
      const result = await model(text.slice(start, start + CHUNK_LENGTH), { top_k: null });

      for (const { label, score } of result) {
        scores[label] = Math.max(scores[label] || 0, score);
      }
    }

    return scores;
  }

  // Turn the six scores into a verdict and the kind of abuse they point to
  static judge(scores) {
    const specific = Object.keys(BLOCK_AT).sort((a, b) => scores[b] - scores[a]);
    const top = specific[0];
    const blocked = specific.find((label) => scores[label] >= BLOCK_AT[label]);

    if (blocked) return { verdict: "explicit", category: CATEGORY[blocked] };

    const grey = scores.toxic >= REVIEW_SCORE || scores[top] >= REVIEW_SCORE;

    return {
      verdict: grey ? "unsure" : "clean",
      category: scores[top] >= REVIEW_SCORE ? CATEGORY[top] : null,
    };
  }

  // The kind of abuse toxic-bert sees in a text, or null (used to label reported feedback)
  static async categoryOf(title, text) {
    if (this.llmOnly || !toxicity.isReady()) return null;
    return this.judge(await this.toxicityScores(`${title}. ${text}`)).category;
  }

  // The instant checks, cheapest first. No LLM, so the sender can wait for it:
  //   1. word list  - a blocked word rejects
  //   2. vectors    - each clause is compared with examples of every kind of abuse
  //   3. toxic-bert - every feedback, all six labels
  // Returns { verdict: "explicit" | "unsure" | "clean", method, category }
  static async screen(title, text) {
    [title, text] = [plain(title), plain(text)];

    const combined = `${title}. ${text}`;
    const unsure = { verdict: "unsure", method: "llm", category: null };

    if (this.llmOnly) return unsure;

    if (WordFilter.findBlockedWord(combined)) {
      return { verdict: "explicit", method: "wordlist", category: "obscene" };
    }

    // Hindi, Arabic and other scripts: only the LLM can read them
    if (WordFilter.hasOtherScript(combined)) return unsure;

    try {
      const vectors = AbuseVectors.isReady() ? await AbuseVectors.check(title, text) : null;

      if (vectors?.verdict === "explicit") {
        return { verdict: "explicit", method: "vectors", category: vectors.category };
      }

      if (!toxicity.isReady()) return unsure;

      const bert = this.judge(await this.toxicityScores(combined));

      if (bert.verdict === "explicit") return { ...bert, method: "bert" };

      if (bert.verdict === "unsure" || vectors?.verdict === "unsure") {
        return { ...unsure, category: bert.category || vectors?.category || null };
      }

      return { verdict: "clean", method: "bert", category: null };
    } catch (error) {
      console.error(`Language models failed, using the LLM instead: ${error.message}`);
      return unsure;
    }
  }

  // The full check: the instant checks, then the LLM for whatever they are unsure about.
  // Returns { explicit, method, category }. `timeout` limits the LLM call.
  static async check(title, text, { timeout } = {}) {
    [title, text] = [plain(title), plain(text)];

    const { verdict, method, category } = await this.screen(title, text);

    if (verdict !== "unsure") return { explicit: verdict === "explicit", method, category };

    return {
      explicit: await ClassificationService.isExplicit(title, text, { timeout }),
      method: "llm",
      category,
    };
  }

}

export default ExplicitFilter;
