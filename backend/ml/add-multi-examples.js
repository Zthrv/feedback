/**
 * Adds hand-written feedback that covers SEVERAL attributes, written so that BERT can tell the
 * attributes apart: each sentence (or each side of a "but") is about exactly one attribute.
 *
 * For every feedback the clauses are produced by the same splitter the server uses, so training
 * sees exactly what the classifier will see. The clause rows go into ml/labels.csv
 * (source = authored) and the whole feedback goes into ml/multi-feedback.json, which
 * ml/evaluate.js uses to test the full text -> several attributes path.
 * A feedback and all its clauses share one train/test split.
 *
 * Safe to run more than once. Run from the backend folder:  node ml/add-multi-examples.js
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { parseCsv, splitFor } from "./labels.js";
import { splitClauses } from "../src/services/clauseSplitter.js";

const here = path.dirname(fileURLToPath(import.meta.url));

const labelsFile = path.join(here, "labels.csv");
const multiFile = path.join(here, "multi-feedback.json");

const [P, N, U] = ["Positive", "Negative", "Neutral"];

// [full text, [[attribute, sentiment], ...] in the order the clauses appear]
const feedback = [
  // ---- separate sentences, both positive ----
  ["You handled the client escalation calmly and gave everyone clear tasks. Your reports always arrive before the deadline.", [["Leadership", P], ["Time Management", P]]],
  ["The code you shipped was clean and well tested. You also explained every change clearly in the review.", [["Work Quality", P], ["Communication", P]]],
  ["You picked up the new tool in a single day. You took full responsibility when the first rollout had a bug.", [["Adaptability", P], ["Accountability", P]]],
  ["You clear more tickets than anyone else on the team. You also help others whenever they get stuck.", [["Productivity", P], ["Teamwork", P]]],
  ["That automation idea was really creative and saved us hours. The finished work was polished and error free.", [["Innovation", P], ["Work Quality", P]]],
  ["You always show up when the team needs help. You share what you learn instead of keeping it to yourself.", [["Reliability", P], ["Teamwork", P]]],
  ["You gave the team a clear plan before the launch. You handled the sudden change of schedule without any fuss.", [["Leadership", P], ["Adaptability", P]]],
  ["You admit your mistakes openly and fix them fast. Your emails are short and to the point.", [["Accountability", P], ["Communication", P]]],
  ["You took over the team lead role smoothly. Your tickets are getting closed faster every week.", [["Leadership", P], ["Productivity", P]]],
  ["Your designs are pixel perfect every time. You never miss a meeting and always arrive prepared.", [["Work Quality", P], ["Reliability", P]]],

  // ---- separate sentences, both negative ----
  ["You keep missing deadlines on your tasks. Your updates in the group chat are confusing and hard to follow.", [["Time Management", N], ["Communication", N]]],
  ["You forget commitments you make in meetings. When things slip you blame other people.", [["Reliability", N], ["Accountability", N]]],
  ["Your last report was full of typos and wrong numbers. You also submitted it two days late.", [["Work Quality", N], ["Time Management", N]]],
  ["You refuse to try any new tools. Your task list keeps growing and very little gets finished.", [["Adaptability", N], ["Productivity", N]]],
  ["You micromanage every little decision on the project. You also take credit for work the rest of us did.", [["Leadership", N], ["Teamwork", N]]],
  ["You barely finished anything this sprint. You also turn up late to almost every meeting.", [["Productivity", N], ["Time Management", N]]],
  ["You never bring any fresh ideas to brainstorms. You complain for weeks whenever the process changes.", [["Innovation", N], ["Adaptability", N]]],
  ["You cancelled on the team twice this week without warning. Your code keeps coming back with bugs.", [["Reliability", N], ["Work Quality", N]]],
  ["You always have an excuse when something goes wrong. You talk over people and never let them finish.", [["Accountability", N], ["Communication", N]]],
  ["You give the team no direction at all. Nothing you work on seems to get finished.", [["Leadership", N], ["Productivity", N]]],
  ["You dismiss other people's ideas without listening. You also resist trying any new approach.", [["Teamwork", N], ["Innovation", N]]],
  ["Your spreadsheet had three errors in the first five minutes. You also promised the update twice and never sent it.", [["Work Quality", N], ["Reliability", N]]],
  ["You freeze when the requirements shift. You also blame the tools whenever your tasks slip.", [["Adaptability", N], ["Accountability", N]]],
  ["Your messages sound harsh and have put people off. You also start important tasks at the very last minute.", [["Communication", N], ["Time Management", N]]],

  // ---- one side positive, one side negative (joined with but / however, or separate sentences) ----
  ["You lead the team confidently, but your written updates are vague and hard to follow.", [["Leadership", P], ["Communication", N]]],
  ["You come up with brilliant ideas, but you rarely deliver them on time.", [["Innovation", P], ["Time Management", N]]],
  ["You support teammates generously, but you often ignore deadlines on your own work.", [["Teamwork", P], ["Time Management", N]]],
  ["Your code is excellent, but you never share what you learn with the others.", [["Work Quality", P], ["Teamwork", N]]],
  ["You always show up on time, however you rarely bring anything new to the discussion.", [["Reliability", P], ["Innovation", N]]],
  ["You deliver a huge amount of work, but a lot of it needs fixing afterwards.", [["Productivity", P], ["Work Quality", N]]],
  ["You adapted to the new process instantly, but you never tell anyone what you are doing.", [["Adaptability", P], ["Communication", N]]],
  ["You explain things really clearly. However, you tend to pass the blame when plans fail.", [["Communication", P], ["Accountability", N]]],
  ["You are friendly with everyone, but you rarely finish the tasks you start.", [["Teamwork", P], ["Productivity", N]]],
  ["You own your mistakes openly, but you keep missing the same deadlines.", [["Accountability", P], ["Time Management", N]]],
  ["You keep the team motivated. But you are often unreachable when we need a decision.", [["Leadership", P], ["Reliability", N]]],
  ["You came up with a clever workaround, but you left no notes for anyone else to follow.", [["Innovation", P], ["Communication", N]]],
  ["You plan your time beautifully, but you brush off everyone else's suggestions.", [["Time Management", P], ["Teamwork", N]]],
  ["You stay calm when requirements change, but your finished work has too many small errors.", [["Adaptability", P], ["Work Quality", N]]],
  ["You are incredibly dependable, but you never suggest any improvements to how we work.", [["Reliability", P], ["Innovation", N]]],
  ["Your output is impressive this quarter, but your tasks are often handed in after the deadline.", [["Productivity", P], ["Time Management", N]]],
  ["You are great at motivating people, but you avoid taking responsibility when the team misses a goal.", [["Leadership", P], ["Accountability", N]]],
  ["You handle every new tool with ease, but your explanations to the team are rushed and unclear.", [["Adaptability", P], ["Communication", N]]],
  ["You communicate beautifully with clients, but you often forget to follow up on what you promised.", [["Communication", P], ["Reliability", N]]],
  ["You plan the schedule well, but the quality of the final product suffers because of shortcuts.", [["Time Management", P], ["Work Quality", N]]],
  ["You pitch fresh ideas all the time, but you take offence whenever someone disagrees.", [["Innovation", P], ["Teamwork", N]]],
  ["You take full ownership of your tasks, however you tend to struggle when plans change suddenly.", [["Accountability", P], ["Adaptability", N]]],
  ["You close an impressive number of tickets, but you rarely tell the team what you are working on.", [["Productivity", P], ["Communication", N]]],
  ["Your reports are always accurate, but you hand them in late almost every week.", [["Work Quality", P], ["Time Management", N]]],

  // ---- three attributes, one per sentence ----
  ["You planned the sprint carefully and everything shipped on schedule. Your explanations in the demo were clear and easy to follow. You also took the blame when one feature failed.", [["Time Management", P], ["Communication", P], ["Accountability", P]]],
  ["You are the fastest on the team at closing tickets. Your code needs a lot of rework afterwards. You also never ask anyone for help.", [["Productivity", P], ["Work Quality", N], ["Teamwork", N]]],
  ["You gave the team a clear direction for the quarter. You were late to nearly every planning meeting. You also stayed relaxed when the plan changed twice.", [["Leadership", P], ["Time Management", N], ["Adaptability", P]]],
  ["Your presentation was creative and fresh. The slides had typos on almost every page. You also skipped the rehearsal without any warning.", [["Innovation", P], ["Work Quality", N], ["Reliability", N]]],
  ["You always follow through on what you promise. You teach the new hires patiently. You also keep every project on a tight schedule.", [["Reliability", P], ["Teamwork", P], ["Time Management", P]]],
  ["You refuse to admit when your estimates are wrong. Your emails ramble and bury the key point. You also resist every new tool we introduce.", [["Accountability", N], ["Communication", N], ["Adaptability", N]]],

  // ---- factual (neutral) mentions of two attributes ----
  ["You were appointed lead for the Pune rollout. You also present the weekly status to the stakeholders.", [["Leadership", U], ["Communication", U]]],
  ["You work with the platform team on the checkout flow. You are the on-call contact every second week.", [["Teamwork", U], ["Reliability", U]]],
  ["You handle around fifteen tickets on a normal day. You review the quality checklist before each release.", [["Productivity", U], ["Work Quality", U]]],
  ["You moved from the backend team to mobile this year. You are researching new analytics tools for the team.", [["Adaptability", U], ["Innovation", U]]],
  ["You are the named owner of the vendor renewal. You block out two hours every morning for focused work.", [["Accountability", U], ["Time Management", U]]],
  ["You explain the roadmap so clearly that nobody has questions afterwards. You also joined the innovation committee this year.", [["Communication", P], ["Innovation", U]]],
];

// ---------------------------------------------------------------------------

// The clauses must match what was labelled, otherwise the labels would be attached to the wrong text
const problems = [];

const prepared = feedback.map(([text, tags], index) => {

  const clauses = splitClauses(text);

  if (clauses.length !== tags.length) {
    problems.push(`#${index + 1}: ${tags.length} labels but the splitter made ${clauses.length} clauses: ${JSON.stringify(clauses)}`);
  }

  return { id: `multi-${index + 1}`, text, split: splitFor(text), clauses, tags };

});

if (problems.length > 0) {
  console.log("Not added. Fix these examples first:\n" + problems.join("\n"));
  process.exit(1);
}

const [header, ...existing] = parseCsv(fs.readFileSync(labelsFile, "utf8"));

const column = (name) => header.indexOf(name);

const known = new Set(existing.map((row) => row[column("clause")].trim().toLowerCase()));

let nextId = existing.reduce((max, row) => Math.max(max, Number(row[column("id")]) || 0), 0) + 1;

const rows = [...existing];

let addedClauses = 0;
let skippedClauses = 0;

for (const item of prepared) {

  item.clauses.forEach((clause, i) => {

    if (known.has(clause.toLowerCase())) {
      skippedClauses++;
      return;
    }

    known.add(clause.toLowerCase());

    const row = new Array(header.length).fill("");

    row[column("id")] = nextId++;
    row[column("split")] = item.split;
    row[column("feedback_id")] = item.id;
    row[column("clause")] = clause;
    row[column("attribute")] = item.tags[i][0];
    row[column("sentiment")] = item.tags[i][1];
    row[column("source")] = "authored";
    row[column("complex")] = "no";

    rows.push(row);

    addedClauses++;

  });

}

const quote = (value) => `"${String(value).replace(/"/g, '""')}"`;

fs.writeFileSync(
  labelsFile,
  "﻿" + [header, ...rows].map((row) => row.map(quote).join(",")).join("\r\n") + "\r\n",
  "utf8"
);

fs.writeFileSync(
  multiFile,
  JSON.stringify(
    prepared.map((item) => ({
      id: item.id,
      split: item.split,
      text: item.text,
      tags: item.tags.map(([attribute, sentiment]) => ({ attribute, sentiment })),
    })),
    null,
    1
  )
);

const count = (split) => prepared.filter((item) => item.split === split).length;

console.log(`${prepared.length} feedback entries (${count("train")} train, ${count("test")} test); every one splits into exactly its labelled clauses`);
console.log(`clause rows added to labels.csv: ${addedClauses} (${skippedClauses} already present); file now has ${rows.length} rows`);
console.log(`wrote ml/multi-feedback.json`);

const perAttribute = {};

for (const item of prepared) {
  for (const [attribute] of item.tags) {
    perAttribute[attribute] = (perAttribute[attribute] || 0) + 1;
  }
}

console.log("feedback per attribute:", Object.entries(perAttribute).map(([a, n]) => `${a} ${n}`).join(", "));
