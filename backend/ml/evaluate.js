/**
 * Measures the BERT classifier on the held-out (test) clauses of labels.csv and compares
 * it with the LLM and with the hybrid (BERT when sure, otherwise the LLM) on the same clauses.
 * Only person-written or person-checked clauses are used (source = seed or authored).
 *
 *   node ml/evaluate.js                         uses ml/model/weights.json
 *   node ml/evaluate.js --weights ml/model/x.json
 *   node ml/evaluate.js --no-llm                skips the (slower) LLM comparison
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));

const weightsIndex = process.argv.indexOf("--weights");

if (weightsIndex > -1) {
  process.env.BERT_WEIGHTS = path.resolve(process.argv[weightsIndex + 1]);
}

const skipLlm = process.argv.includes("--no-llm");

const { default: BertClassifier } = await import("../src/services/bertClassifier.js");
const { default: EmbeddingService } = await import("../src/services/embeddingService.js");
const { default: ClassificationService } = await import("../src/services/classificationService.js");
const { default: FeedbackModel } = await import("../src/models/FeedbackModel.js");
const { default: pool } = await import("../src/config/database.js");
const { readLabels } = await import("./labels.js");
const { splitClauses } = await import("../src/services/clauseSplitter.js");

if (!BertClassifier.isAvailable()) {
  console.log("No trained weights found. Run  node ml/train.js  first.");
  process.exit(1);
}

const attributes = await FeedbackModel.getAttributes();

const test = readLabels().clauses.filter(
  (c) => c.split === "test" && c.source !== "llm" && c.labels.length > 0
);

const easyCount = test.filter((c) => !c.complex).length;

console.log(`${test.length} held-out clauses written or checked by a person: ${easyCount} easy, ${test.length - easyCount} complex\n`);

const vectors = await EmbeddingService.embed(test.map((c) => c.clause));

const scored = vectors.map((vector) => BertClassifier.scoreVector(vector));

// BERT returns whole attribute records; the labels use plain names
const named = (tags) => tags.map((t) => ({ attribute: t.attribute.attribute_name, feedbackType: t.feedbackType }));

/**
 * Compare predicted tags with the true labels of each clause
 */
function measure(items) {

  let tp = 0, fp = 0, fn = 0, sentimentRight = 0, exact = 0;

  for (const { truth, predicted } of items) {

    const predictedMap = new Map(predicted.map((t) => [t.attribute, t.feedbackType]));

    const truthMap = new Map(truth.map((t) => [t.attribute, t.sentiment]));

    let allRight = predictedMap.size === truthMap.size;

    for (const [attribute, sentiment] of truthMap) {

      if (predictedMap.has(attribute)) {

        tp++;

        if (predictedMap.get(attribute) === sentiment) {
          sentimentRight++;
        } else {
          allRight = false;
        }

      } else {
        fn++;
        allRight = false;
      }

    }

    for (const attribute of predictedMap.keys()) {
      if (!truthMap.has(attribute)) {
        fp++;
        allRight = false;
      }
    }

    if (allRight) {
      exact++;
    }

  }

  const precision = tp / (tp + fp || 1);
  const recall = tp / (tp + fn || 1);

  return {
    clauses: items.length,
    precision,
    recall,
    f1: (2 * precision * recall) / (precision + recall || 1),
    sentiment: sentimentRight / (tp || 1),
    exact: exact / (items.length || 1),
  };

}

const pct = (v) => `${(v * 100).toFixed(0)}%`.padStart(4);

function line(name, m) {
  return `${name.padEnd(40)} ${String(m.clauses).padStart(3)} clauses | attribute P ${pct(m.precision)} R ${pct(m.recall)} F1 ${pct(m.f1)} | sentiment right ${pct(m.sentiment)} | fully correct ${pct(m.exact)}`;
}

const decide = () => scored.map((scores) => BertClassifier.decide([scores], attributes));

// ---- the LLM on the same clauses ----
let llmPredictions = null;

if (!skipLlm) {

  console.log("asking the LLM about the same clauses...\n");

  llmPredictions = [];

  for (const c of test) {

    try {
      llmPredictions.push(
        (await ClassificationService.classifyAttributes("", c.clause, attributes)).map((t) => ({
          attribute: t.attribute.attribute_name,
          feedbackType: t.feedbackType,
        }))
      );
    } catch (error) {
      console.log(`  LLM failed: ${error.message}`);
      llmPredictions.push([]);
    }

  }

}

const truthOf = (i) => test[i].labels;

function report(title) {

  const decisions = decide();

  const bert = test.map((c, i) => ({ truth: truthOf(i), predicted: named(decisions[i].tags), confident: decisions[i].confident }));

  const kept = bert.filter((item) => item.confident);

  const complexIndexes = test.map((c, i) => (c.complex ? i : -1)).filter((i) => i >= 0);
  const easyIndexes = test.map((c, i) => (!c.complex ? i : -1)).filter((i) => i >= 0);

  console.log(title);

  console.log(line("  BERT alone, every clause", measure(bert)));

  if (kept.length > 0) {
    console.log(line("  BERT, only the clauses it is sure of", measure(kept)));
  }

  if (llmPredictions) {

    console.log(line("  LLM alone, every clause", measure(test.map((c, i) => ({ truth: truthOf(i), predicted: llmPredictions[i] })))));

    const hybrid = test.map((c, i) => ({
      truth: truthOf(i),
      predicted: decisions[i].confident ? bert[i].predicted : llmPredictions[i],
    }));

    console.log(line("  HYBRID (BERT when sure, else LLM)", measure(hybrid)));

  }

  const passedComplex = complexIndexes.filter((i) => !decisions[i].confident).length;
  const keptEasy = easyIndexes.filter((i) => decisions[i].confident).length;

  console.log(`  gate: ${passedComplex} of ${complexIndexes.length} complex clauses passed to the LLM (${pct(passedComplex / (complexIndexes.length || 1))}); ` +
    `BERT handled ${keptEasy} of ${easyIndexes.length} easy clauses (${pct(keptEasy / (easyIndexes.length || 1))})`);

  const keptComplex = complexIndexes.filter((i) => decisions[i].confident);

  if (keptComplex.length > 0) {
    console.log(line("  complex clauses BERT kept (errors here)", measure(keptComplex.map((i) => bert[i]))));
  }

  console.log("");

}

report("Settings stored in the weights file:");

// ---- whole feedback that covers several attributes (full text in, several tags out) ----
const multi = fs.existsSync(path.join(here, "multi-feedback.json"))
  ? JSON.parse(fs.readFileSync(path.join(here, "multi-feedback.json"), "utf8")).filter((m) => m.split === "test")
  : [];

const multiScores = [];

for (const m of multi) {
  const vectors = await EmbeddingService.embed(splitClauses(m.text));
  multiScores.push(vectors.map((vector) => BertClassifier.scoreVector(vector)));
}

let multiLlm = null;

if (llmPredictions && multi.length > 0) {

  multiLlm = [];

  for (const m of multi) {

    try {
      multiLlm.push(
        (await ClassificationService.classifyAttributes("", m.text, attributes)).map((t) => ({
          attribute: t.attribute.attribute_name,
          feedbackType: t.feedbackType,
        }))
      );
    } catch (error) {
      console.log(`  LLM failed: ${error.message}`);
      multiLlm.push([]);
    }

  }

}

// Same attributes found, ignoring Positive/Negative?
function sameAttributes(items) {

  const right = items.filter(({ truth, predicted }) => {
    const a = new Set(truth.map((t) => t.attribute));
    const b = new Set(predicted.map((t) => t.attribute));
    return a.size === b.size && [...a].every((x) => b.has(x));
  }).length;

  return right / (items.length || 1);

}

function multiItems() {

  const decisions = multiScores.map((scores) => BertClassifier.decide(scores, attributes));

  return {
    decisions,
    bert: multi.map((m, i) => ({ truth: m.tags, predicted: named(decisions[i].tags) })),
    hybrid: multiLlm
      ? multi.map((m, i) => ({ truth: m.tags, predicted: decisions[i].confident ? named(decisions[i].tags) : multiLlm[i] }))
      : null,
  };

}

if (multi.length > 0) {

  const { decisions, bert, hybrid } = multiItems();

  console.log(`Whole feedback covering several attributes (${multi.length} held-out feedback, full text in, tags out):`);

  console.log(line("  BERT alone", measure(bert)) + ` | same attributes ${pct(sameAttributes(bert))}`);

  if (multiLlm) {

    const llm = multi.map((m, i) => ({ truth: m.tags, predicted: multiLlm[i] }));

    console.log(line("  LLM alone", measure(llm)) + ` | same attributes ${pct(sameAttributes(llm))}`);

    console.log(line("  HYBRID (BERT when sure, else LLM)", measure(hybrid)) + ` | same attributes ${pct(sameAttributes(hybrid))}`);

  }

  const sure = decisions.filter((d) => d.confident).length;

  console.log(`  BERT was sure about ${sure} of ${multi.length} feedback; it passed ${multi.length - sure} to the LLM\n`);

}


// ---- how the two confidence settings trade coverage for accuracy ----
console.log("Grid of settings (BERT handles the share shown, the LLM the rest):");

console.log("  complexThreshold  margin | BERT handles | complex passed on | hybrid fully correct | whole feedback: BERT handles / hybrid fully correct" + (llmPredictions ? "" : " (needs the LLM run)"));

for (const complexThreshold of [0.3, 0.4, 0.5, 0.6, 0.7]) {

  for (const minSentimentMargin of [0.1, 0.2, 0.3]) {

    BertClassifier.setThresholds({ complexThreshold, minSentimentMargin });

    const decisions = decide();

    const handled = decisions.filter((d) => d.confident).length;

    const complexIndexes = test.map((c, i) => (c.complex ? i : -1)).filter((i) => i >= 0);

    const passed = complexIndexes.filter((i) => !decisions[i].confident).length;

    let hybridExact = "";

    if (llmPredictions) {

      const hybrid = test.map((c, i) => ({
        truth: truthOf(i),
        predicted: decisions[i].confident ? named(decisions[i].tags) : llmPredictions[i],
      }));

      hybridExact = pct(measure(hybrid).exact);

    }

    let wholeText = "";

    if (multi.length > 0) {

      const { decisions: md, hybrid: mh } = multiItems();

      wholeText = ` | ${pct(md.filter((d) => d.confident).length / multi.length)} / ${mh ? pct(measure(mh).exact) : ""}`;

    }

    console.log(`  ${complexThreshold.toFixed(1).padStart(15)}  ${minSentimentMargin.toFixed(1).padStart(6)} | ${pct(handled / test.length).padStart(12)} | ${pct(passed / (complexIndexes.length || 1)).padStart(17)} | ${hybridExact.padStart(20)}${wholeText}`);

  }

}

await pool.end();
process.exit(0);
