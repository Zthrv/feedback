/**
 * Adds hand-written training examples to ml/labels.csv (source = "authored").
 * Safe to run more than once: clauses already in the file are skipped.
 *
 *   EASY    100 clauses, 10 per attribute: one clear topic with a clear sentiment.
 *           These teach BERT what each attribute sounds like.
 *   COMPLEX  50 clauses that are confusing on purpose: two or three topics in one
 *           clause, sarcasm, double negatives, conditionals, vague or implied
 *           feedback. These teach BERT to recognise "too hard for me" so they are
 *           handed to the LLM.
 *
 * Run from the backend folder:  node ml/add-examples.js
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { parseCsv, splitFor } from "./labels.js";

const here = path.dirname(fileURLToPath(import.meta.url));

const file = path.join(here, "labels.csv");

const [P, N, U] = ["Positive", "Negative", "Neutral"];

// [clause, [[attribute, sentiment], ...]]
const easy = [
  // ---- Leadership ----
  ["Our manager stayed calm during the audit and gave the whole team clear instructions.", [["Leadership", P]]],
  ["You set a bold vision for the new product line and got everyone excited to work on it.", [["Leadership", P]]],
  ["I admire how you hand out responsibilities and trust people to handle them.", [["Leadership", P]]],
  ["You stepped forward to run the retrospective when nobody else would, and it went really well.", [["Leadership", P]]],
  ["You rarely give the team a direction, so we spend meetings guessing what the priorities are.", [["Leadership", N]]],
  ["Decisions on this project keep getting delayed because you won't commit to a plan.", [["Leadership", N]]],
  ["You micromanage every little detail, and it kills the team's confidence to decide things.", [["Leadership", N]]],
  ["Nobody really looks to you for guidance during a crisis, since you tend to freeze up.", [["Leadership", N]]],
  ["You were appointed team lead for the Pune rollout starting next quarter.", [["Leadership", U]]],
  ["You chair the weekly planning meeting and assign the sprint tasks.", [["Leadership", U]]],

  // ---- Productivity ----
  ["You finished the migration in half the time we estimated and still helped others with theirs.", [["Productivity", P]]],
  ["Your output this quarter has been outstanding, easily the highest on the team.", [["Productivity", P]]],
  ["You clear your backlog faster than anyone I know and never seem rushed.", [["Productivity", P]]],
  ["Honestly, you get through a mountain of tickets every sprint without breaking a sweat.", [["Productivity", P]]],
  ["Only two of your eight sprint tasks were completed, and several have not even been started.", [["Productivity", N]]],
  ["Your pace has slowed noticeably lately, and the team is carrying more of the load.", [["Productivity", N]]],
  ["You spend hours on small things and the bigger goals keep slipping further behind.", [["Productivity", N]]],
  ["Barely any visible progress has come from your side of the project this month.", [["Productivity", N]]],
  ["You handle around fifteen support tickets on a typical day.", [["Productivity", U]]],
  ["You have been assigned three projects this quarter alongside your regular duties.", [["Productivity", U]]],

  // ---- Work Quality ----
  ["Your designs are always pixel perfect and the client has never asked for a revision.", [["Work Quality", P]]],
  ["I trust your code completely because it is clean, tested and well documented.", [["Work Quality", P]]],
  ["The analysis you delivered was accurate down to the last detail and really thorough.", [["Work Quality", P]]],
  ["Everything you hand over is polished, and I never have to double-check it.", [["Work Quality", P]]],
  ["The report had several calculation errors and a few sections were left half written.", [["Work Quality", N]]],
  ["Your pull requests keep coming back with bugs and missing tests, which wastes everybody's time.", [["Work Quality", N]]],
  ["The final slides looked rushed, with typos on almost every page and inconsistent formatting.", [["Work Quality", N]]],
  ["I found three mistakes in your spreadsheet in the first five minutes of looking at it.", [["Work Quality", N]]],
  ["You review the weekly quality checklist before every release goes out.", [["Work Quality", U]]],
  ["You are responsible for proofreading the client documents each Friday.", [["Work Quality", U]]],

  // ---- Teamwork ----
  ["You always make room for quieter teammates and make sure everyone's ideas get heard.", [["Teamwork", P]]],
  ["Thanks for jumping in to help me debug at the end of your own busy day, it meant a lot.", [["Teamwork", P]]],
  ["You share credit generously and celebrate everybody's wins, which keeps the team tight.", [["Teamwork", P]]],
  ["Working with you is easy because you listen, support others and never start drama.", [["Teamwork", P]]],
  ["You tend to work alone and never ask the team for input, so we duplicate each other's effort.", [["Teamwork", N]]],
  ["You took the credit for our group presentation and barely mentioned anyone else's work.", [["Teamwork", N]]],
  ["You often dismiss other people's suggestions without really hearing them out.", [["Teamwork", N]]],
  ["Teammates avoid pairing with you because you get defensive when someone disagrees.", [["Teamwork", N]]],
  ["You sit with the platform team and attend their daily standups.", [["Teamwork", U]]],
  ["You are part of the cross-functional group working on the checkout flow.", [["Teamwork", U]]],

  // ---- Reliability ----
  ["Whenever you promise to do something it gets done, and I never have to chase you.", [["Reliability", P]]],
  ["You've been dependable through every release, always there when something breaks.", [["Reliability", P]]],
  ["I can rely on you to show up prepared for every single meeting.", [["Reliability", P]]],
  ["You follow through on commitments consistently, which makes planning around you easy.", [["Reliability", P]]],
  ["You've cancelled on us twice this week without notice, and we had to scramble to cover.", [["Reliability", N]]],
  ["I can't count on you to follow up, because promised updates just never arrive.", [["Reliability", N]]],
  ["Several times you said you would handle it and then it silently fell through.", [["Reliability", N]]],
  ["It's hard to trust that you'll show up when it matters, given how often you've disappeared.", [["Reliability", N]]],
  ["You are the on-call contact for the payments service every second week.", [["Reliability", U]]],
  ["You have given the team your availability schedule for the next month.", [["Reliability", U]]],

  // ---- Communication ----
  ["You explain tricky topics in simple words, and I always leave your talks understanding more.", [["Communication", P]]],
  ["Your status updates are short, clear and always have exactly what I need to know.", [["Communication", P]]],
  ["You listen carefully before answering and then respond with respect, even in tense meetings.", [["Communication", P]]],
  ["The way you summarised the long thread for leadership was clear and really helpful.", [["Communication", P]]],
  ["Your emails ramble on and the actual request gets lost somewhere in the middle.", [["Communication", N]]],
  ["You use so much jargon in meetings that half the room has no idea what you mean.", [["Communication", N]]],
  ["Your tone in messages can sound harsh and has put a few colleagues off.", [["Communication", N]]],
  ["You talk over people in meetings and don't let them finish their thoughts.", [["Communication", N]]],
  ["You present the project status to the stakeholders every other Thursday.", [["Communication", U]]],
  ["You write the monthly newsletter that goes out to the whole department.", [["Communication", U]]],

  // ---- Innovation ----
  ["That automation script you came up with removed a whole day of manual work every week.", [["Innovation", P]]],
  ["You keep bringing fresh ideas to brainstorms, and many of them end up changing how we work.", [["Innovation", P]]],
  ["Your creative twist on the onboarding flow made it far simpler for new users.", [["Innovation", P]]],
  ["I love how you question old habits and suggest smarter ways of doing things.", [["Innovation", P]]],
  ["You keep proposing the same old approach and shut down anything new the team suggests.", [["Innovation", N]]],
  ["Nothing about your solution is new or creative, you just copy what was done before.", [["Innovation", N]]],
  ["You rarely offer ideas in brainstorms, and that leaves us stuck with the usual answers.", [["Innovation", N]]],
  ["The team feels stuck because you resist trying any new tools or methods.", [["Innovation", N]]],
  ["You are researching new analytics tools for the team to evaluate this quarter.", [["Innovation", U]]],
  ["You joined the innovation committee that meets once a month.", [["Innovation", U]]],

  // ---- Adaptability ----
  ["You picked up the new framework in two days and then taught it to the rest of us.", [["Adaptability", P]]],
  ["When priorities flipped overnight you adjusted straight away and kept everyone moving.", [["Adaptability", P]]],
  ["You stay relaxed when plans change and find a way to make the new situation work.", [["Adaptability", P]]],
  ["I'm impressed by how quickly you settled into a completely different role.", [["Adaptability", P]]],
  ["You complained for weeks about the new workflow instead of trying to get used to it.", [["Adaptability", N]]],
  ["Any change in plan throws you off, and it takes you ages to recover.", [["Adaptability", N]]],
  ["You keep going back to the old process even though the whole team has moved on.", [["Adaptability", N]]],
  ["When the requirements shifted you froze and waited to be told exactly what to do.", [["Adaptability", N]]],
  ["You moved from the backend team to the mobile team at the start of the year.", [["Adaptability", U]]],
  ["You have switched between three different projects since January.", [["Adaptability", U]]],

  // ---- Accountability ----
  ["You owned the outage right away, told the client yourself and fixed it before lunch.", [["Accountability", P]]],
  ["When your estimate was wrong you admitted it openly and explained how you'd improve.", [["Accountability", P]]],
  ["I respect that you take responsibility for your tasks and never pass the blame on.", [["Accountability", P]]],
  ["You follow every decision through to the end and answer for how it turns out.", [["Accountability", P]]],
  ["When the release failed you pointed fingers at other people instead of owning your part.", [["Accountability", N]]],
  ["You always have an excuse ready whenever something you were responsible for goes wrong.", [["Accountability", N]]],
  ["Mistakes seem to just disappear on your side because you never acknowledge them.", [["Accountability", N]]],
  ["You blame the tools or the timeline instead of looking at what you could have done.", [["Accountability", N]]],
  ["You are the named owner for the vendor contract renewal this year.", [["Accountability", U]]],
  ["You sign off on the final deployment checklist before each release.", [["Accountability", U]]],

  // ---- Time Management ----
  ["You plan your week carefully and every deliverable arrives before its deadline.", [["Time Management", P]]],
  ["Thanks for breaking the project into milestones, it made the schedule easy to follow.", [["Time Management", P]]],
  ["You prioritise brilliantly and always know exactly what to tackle first.", [["Time Management", P]]],
  ["You are never late to meetings and you finish tasks well ahead of the deadline.", [["Time Management", P]]],
  ["You start important tasks at the last minute and the rush shows in the final result.", [["Time Management", N]]],
  ["Deadlines keep slipping on your tasks, and the rest of us are forced to adjust.", [["Time Management", N]]],
  ["You arrive late to most meetings and often miss the first fifteen minutes.", [["Time Management", N]]],
  ["You say yes to everything and then run out of time to finish any of it.", [["Time Management", N]]],
  ["You block out two hours every morning for focused work.", [["Time Management", U]]],
  ["You keep a shared calendar so the team can see when you're available.", [["Time Management", U]]],
];

const complex = [
  // ---- two topics in one clause, same sentiment (no "but" to split on) ----
  ["You lead the team confidently and always deliver on schedule.", [["Leadership", P], ["Time Management", P]]],
  ["Your code is clean and well tested, and you explain it clearly in reviews.", [["Work Quality", P], ["Communication", P]]],
  ["You adapt to changes quickly and take ownership of whatever comes up.", [["Adaptability", P], ["Accountability", P]]],
  ["You miss deadlines constantly and your updates never explain why.", [["Time Management", N], ["Communication", N]]],
  ["You are very productive and also great at helping others get unstuck.", [["Productivity", P], ["Teamwork", P]]],
  ["Your ideas are creative and the work that results is always polished.", [["Innovation", P], ["Work Quality", P]]],
  ["You often forget commitments and then blame others when things slip.", [["Reliability", N], ["Accountability", N]]],
  ["You share knowledge generously and always show up when the team needs you.", [["Teamwork", P], ["Reliability", P]]],
  ["You rush your tasks and the output is full of mistakes.", [["Time Management", N], ["Work Quality", N]]],
  ["You resist new tools and keep missing the targets we set.", [["Adaptability", N], ["Productivity", N]]],

  // ---- two topics in one clause, opposite sentiments (no "but" to split on) ----
  ["You run meetings confidently and your written updates confuse everyone.", [["Leadership", P], ["Communication", N]]],
  ["You are brilliant at generating ideas and terrible at delivering them on time.", [["Innovation", P], ["Time Management", N]]],
  ["You support teammates generously and then ignore deadlines on your own work.", [["Teamwork", P], ["Time Management", N]]],
  ["You write excellent code and keep it to yourself instead of sharing what you learn.", [["Work Quality", P], ["Teamwork", N]]],
  ["You always show up on time and rarely contribute anything new to the discussion.", [["Reliability", P], ["Innovation", N]]],
  ["You deliver a huge amount of work and a good share of it needs fixing.", [["Productivity", P], ["Work Quality", N]]],
  ["You adapted to the new process instantly and still don't tell anyone what you're doing.", [["Adaptability", P], ["Communication", N]]],
  ["You explain things clearly and regularly pass the blame when plans fail.", [["Communication", P], ["Accountability", N]]],
  ["You are friendly with everyone and almost never finish tasks you start.", [["Teamwork", P], ["Productivity", N]]],
  ["You own your mistakes openly and keep missing the same deadlines.", [["Accountability", P], ["Time Management", N]]],
  ["You keep the team motivated and you are often unreachable when we need decisions.", [["Leadership", P], ["Reliability", N]]],
  ["You came up with a clever workaround and left no documentation for anyone else.", [["Innovation", P], ["Communication", N]]],
  ["You plan your time beautifully and dismiss everyone else's suggestions.", [["Time Management", P], ["Teamwork", N]]],
  ["You stay calm under changing requirements and your finished work is full of small errors.", [["Adaptability", P], ["Work Quality", N]]],

  // ---- sarcasm, double negatives, conditionals, hedging ----
  ["Wow, great job being late to the client call again.", [["Time Management", N]]],
  ["Thanks so much for taking all the credit, really appreciate it.", [["Teamwork", N]]],
  ["I wouldn't say you are unreliable, you just vanish whenever something gets difficult.", [["Reliability", N]]],
  ["It's not that your code is bad, it just never seems finished.", [["Productivity", N]]],
  ["If you spoke up in meetings more you would make an excellent leader.", [["Communication", N], ["Leadership", U]]],
  ["Not once did you miss a deadline this quarter, which honestly surprised me.", [["Time Management", P]]],
  ["You could not have handled that angry customer any better.", [["Communication", P]]],
  ["Oh sure, your plan was flawless, apart from nobody understanding any of it.", [["Communication", N]]],
  ["For a beginner you have done fine, I suppose, nothing special.", [["Work Quality", U]]],
  ["Some days you are great to work with and other days you disappear completely.", [["Reliability", N], ["Teamwork", U]]],
  ["Your attitude towards the new process has been interesting to watch.", [["Adaptability", U]]],
  ["The team is still deciding how it feels about your proposal.", [["Innovation", U]]],
  ["You certainly keep everyone on their toes with your last-minute changes.", [["Time Management", N]]],
  ["Your approach was unusual and people reacted in very different ways.", [["Innovation", U]]],

  // ---- implied feedback with no obvious keywords ----
  ["I never know what you are working on unless I ask three times.", [["Communication", N]]],
  ["Every time we need something urgent, you are nowhere to be found.", [["Reliability", N]]],
  ["People tend to go quiet when you walk into a meeting.", [["Teamwork", N]]],
  ["The client mentioned your name twice as the reason the project went so smoothly.", [["Work Quality", P]]],
  ["Last week you rewrote the whole pipeline over a weekend and nobody even asked you to.", [["Productivity", P], ["Accountability", P]]],
  ["We stopped inviting you to the planning sessions because they always ran long.", [["Time Management", N]]],
  ["The new hires always end up asking you before they ask their own manager.", [["Leadership", P], ["Teamwork", P]]],
  ["You were the only one who read the whole contract before signing it.", [["Accountability", P], ["Work Quality", P]]],

  // ---- three topics in one clause ----
  ["You are quick, careful and always willing to help.", [["Productivity", P], ["Work Quality", P], ["Teamwork", P]]],
  ["You plan ahead, communicate clearly and take full responsibility for results.", [["Time Management", P], ["Communication", P], ["Accountability", P]]],
  ["You are late, disorganised and rude to the rest of the team.", [["Time Management", N], ["Teamwork", N]]],
  ["You innovate, lead and deliver, which is exactly what this team needs.", [["Innovation", P], ["Leadership", P], ["Productivity", P]]],
];

// ---------------------------------------------------------------------------

const [header, ...existing] = parseCsv(fs.readFileSync(file, "utf8"));

const column = (name) => header.indexOf(name);

const clauseColumn = column("clause");

const known = new Set(existing.map((row) => row[clauseColumn].trim().toLowerCase()));

// Make sure there is a "complex" column (older files do not have one)
let rows = existing;

if (column("complex") === -1) {
  header.push("complex");
  rows = rows.map((row) => [...row, ""]);
}

let nextId = rows.reduce((max, row) => Math.max(max, Number(row[column("id")]) || 0), 0) + 1;

let added = 0;
let skipped = 0;

const add = (items, isComplex) => {

  for (const [clause, tags] of items) {

    if (known.has(clause.toLowerCase())) {
      skipped++;
      continue;
    }

    known.add(clause.toLowerCase());

    for (const [attribute, sentiment] of tags) {

      const row = new Array(header.length).fill("");

      row[column("id")] = nextId++;
      row[column("split")] = splitFor(clause);
      row[column("clause")] = clause;
      row[column("attribute")] = attribute;
      row[column("sentiment")] = sentiment;
      row[column("source")] = "authored";
      row[column("complex")] = isComplex ? "yes" : "no";

      rows.push(row);

    }

    added++;

  }

};

add(easy, false);
add(complex, true);

const quote = (value) => `"${String(value).replace(/"/g, '""')}"`;

fs.writeFileSync(
  file,
  "﻿" + [header, ...rows].map((row) => row.map(quote).join(",")).join("\r\n") + "\r\n",
  "utf8"
);

const authored = rows.filter((row) => row[column("source")] === "authored");

const countSplit = (name, isComplex) =>
  new Set(
    authored
      .filter((row) => row[column("split")] === name && (row[column("complex")] === "yes") === isComplex)
      .map((row) => row[clauseColumn])
  ).size;

console.log(`added ${added} new clauses (${skipped} already present); file now has ${rows.length} rows`);
console.log(`easy:    train ${countSplit("train", false)}, test ${countSplit("test", false)}`);
console.log(`complex: train ${countSplit("train", true)}, test ${countSplit("test", true)}`);
