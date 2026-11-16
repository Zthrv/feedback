/**
 * Builds the vectors for the abuse check from backend/ml/abuse-examples.json.
 *
 * Every example sentence is turned into a vector by the embedding model. The vectors are kept
 * in separate groups, one per type of abuse (sexual, threat, insult, identity) plus one group
 * of clean sentences, so the server can compare a new feedback with each type on its own.
 *
 * Run from the backend folder after changing the examples:
 *   node ml/train-abuse.js                       writes ml/model/abuse-vectors.json (used by the server)
 *   node ml/train-abuse.js --out ml/model/x.json writes somewhere else (e.g. a dry run)
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import EmbeddingService from "../src/services/embeddingService.js";

const here = path.dirname(fileURLToPath(import.meta.url));

const outIndex = process.argv.indexOf("--out");

const outPath = outIndex > -1
  ? path.resolve(process.argv[outIndex + 1])
  : path.join(here, "model", "abuse-vectors.json");

const examples = JSON.parse(
  fs.readFileSync(path.join(here, "abuse-examples.json"), "utf8")
);

async function embedAll(sentences) {

  const vectors = [];

  for (let i = 0; i < sentences.length; i += 32) {
    vectors.push(...(await EmbeddingService.embed(sentences.slice(i, i + 32))));
  }

  // Five decimals are plenty and keep the file small
  return vectors.map((vector) => vector.map((value) => Number(value.toFixed(5))));

}

const abuse = {};

for (const [category, sentences] of Object.entries(examples.abuse)) {

  abuse[category] = await embedAll(sentences);

  console.log(`${category}: ${sentences.length} examples`);

}

const clean = await embedAll(examples.clean);

console.log(`clean: ${examples.clean.length} examples`);

fs.mkdirSync(path.dirname(outPath), { recursive: true });

fs.writeFileSync(outPath, JSON.stringify({ abuse, clean }));

console.log(`written to ${outPath}`);
