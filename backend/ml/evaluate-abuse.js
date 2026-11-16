/**
 * Measures the abuse vector check on sentences it was not trained on.
 *
 * For each sentence it prints what the check decided:
 *   explicit - rejected by the vectors alone
 *   unsure   - handed to the LLM
 *   clean    - passed on to the rest of the language check
 * An abusive sentence counts as caught when it is explicit or unsure, and a clean sentence
 * counts as right when it is clean or unsure (the LLM then has the final word). The two
 * numbers that must stay at zero are abusive sentences judged clean and clean ones judged explicit.
 *
 *   node ml/evaluate-abuse.js                          uses ml/model/abuse-vectors.json
 *   node ml/evaluate-abuse.js --vectors ml/model/x.json
 *   node ml/evaluate-abuse.js --all                    prints every sentence, not just the misses
 */
import path from "path";

const vectorsIndex = process.argv.indexOf("--vectors");

if (vectorsIndex > -1) {
  process.env.ABUSE_VECTORS = path.resolve(process.argv[vectorsIndex + 1]);
}

const showAll = process.argv.includes("--all");

const { default: AbuseVectors } = await import("../src/services/abuseVectors.js");

if (!AbuseVectors.isAvailable()) {
  console.log("No abuse vectors found. Run  node ml/train-abuse.js  first.");
  process.exit(1);
}

// None of these sentences appear in abuse-examples.json
const abusive = {
  sexual: [
    "i lke your body",
    "i like ur body",
    "Your figure is gorgeous, I think about it all day.",
    "That skirt shows off your legs nicely, wear it again.",
    "Why don't you come over to my flat tonight, we can be alone.",
    "Share some pictures of yourself in a bikini.",
    "I can't focus when you bend over near my desk.",
    "I would love to hold you close and kiss your neck.",
    "You get me excited whenever you are near.",
    "If you spend the weekend with me, I will make sure you get a good rating.",
    "You have a very sexy voice, call me late at night.",
    "I fantasise about you.",
  ],
  threat: [
    "I know which bus you take home every day.",
    "You had better watch out when you are in the parking lot.",
    "I will make sure you regret ever joining this team.",
    "Someday I am going to hurt you badly.",
    "I hope you have an accident on the way home.",
    "Everyone would be happier if you were dead.",
    "You don't deserve to be alive.",
    "Take back what you said or something will happen to you.",
    "I will smash your face.",
    "I know people who can deal with you permanently.",
    "Be afraid, I am always behind you.",
    "I will come to your house tonight and teach you a lesson.",
  ],
  insult: [
    "You are a total moron.",
    "You are worthless and everyone knows it.",
    "What a useless, brainless person you are.",
    "You are a disgrace of a human being.",
    "Nobody can stand you, you are repulsive.",
    "You are the stupidest person in this building.",
    "You are a filthy little worm.",
    "Your face is ugly and so is your personality.",
    "You are a loser and always will be.",
    "You are dumb as a rock.",
    "Your family should be embarrassed to have you.",
    "You are human garbage.",
  ],
  identity: [
    "Women are not smart enough to write code.",
    "You only got promoted because you are a girl.",
    "People of your caste are not fit for office work.",
    "Your religion teaches you to be violent.",
    "People from your part of the country are all cheats.",
    "You are too old for this industry, make room for young people.",
    "Someone with your disability cannot do real work.",
    "People like you who are gay should not be in our team.",
    "Go back to where you came from, outsider.",
    "Dark-skinned people like you should stay away from clients.",
    "A man should lead this team, not a woman.",
    "Reservation candidates like you have no real talent.",
  ],
};

const clean = [
  "I like your work ethic.",
  "I like your style of documentation.",
  "I love how you organise the sprint board.",
  "Your body of research for the proposal was thorough.",
  "Your body language during the pitch was confident.",
  "You look well prepared for every meeting.",
  "The UI you built looks gorgeous.",
  "You totally killed that interview panel.",
  "You crushed it at the hackathon.",
  "You are a machine when it comes to closing tickets.",
  "Your code is terrible and impossible to read.",
  "That was a dumb way to design the database.",
  "You are lazy about writing tests.",
  "Your estimates are a joke, they are never right.",
  "You are hopeless at time management.",
  "Your attitude in meetings is awful.",
  "You were rude to the client and it cost us the deal.",
  "You are the weakest link on the team right now, you need to step up.",
  "You dump your work on others and disappear.",
  "You need to stop making excuses.",
  "Frankly, your last three deliveries were rubbish.",
  "You will be sorry if you keep ignoring code review comments, the bugs will pile up.",
  "Be careful with the deployment scripts.",
  "I know where to find your documentation now, thanks for organising it.",
  "Please send the photos from the offsite to the group.",
  "Could you share pictures of the architecture diagram?",
  "Let's meet privately to go over your appraisal feedback.",
  "Come over to my desk tomorrow and we can pair on the bug.",
  "I would love to see more of your prototypes.",
  "I want you to present at the next all-hands.",
  "I think about your feedback often and it has helped me.",
  "You make everyone feel included.",
  "People enjoy being around you because you are so positive.",
  "Nobody on the team writes cleaner code than you.",
  "You supported women returning from maternity leave really well.",
  "You are respectful of every colleague's faith and culture.",
  "Despite being the youngest in the team, you lead with maturity.",
  "Your years of experience make you the person everyone goes to.",
  "You stood up against the harassment a colleague was facing.",
  "You calmly handled a customer who was threatening to sue.",
  "You killed the bad deployment before it reached customers.",
  "You beat every target this quarter.",
  "You are dead right about the caching issue.",
  "Thanks for staying late to finish the release.",
  "Your communication needs work.",
  "Aapka kaam accha tha, bas deadline ka dhyan rakho.",
  "Tumhari coding bahut acchi hai.",
  "Nice work.",
];

await (await import("../src/services/embeddingService.js")).default.warmUp();

const counts = {
  abusive: { explicit: 0, unsure: 0, clean: 0 },
  clean: { explicit: 0, unsure: 0, clean: 0 },
};

async function run(sentence, kind, expectedCategory) {

  const result = await AbuseVectors.check("Feedback", sentence);

  counts[kind][result.verdict]++;

  const wrong =
    (kind === "abusive" && result.verdict === "clean") ||
    (kind === "clean" && result.verdict === "explicit");

  const wrongType =
    kind === "abusive" && result.verdict !== "clean" && result.category !== expectedCategory;

  if (showAll || wrong || wrongType) {
    console.log(
      `${wrong ? "MISS" : wrongType ? "type" : "    "} ${result.verdict.padEnd(8)} ` +
      `${(result.category || "").padEnd(8)} score=${result.score.toFixed(2)} ` +
      `margin=${result.margin.toFixed(2)} | ${expectedCategory || "clean"}: ${sentence}`
    );
  }

}

for (const [category, sentences] of Object.entries(abusive)) {
  for (const sentence of sentences) {
    await run(sentence, "abusive", category);
  }
}

for (const sentence of clean) {
  await run(sentence, "clean", null);
}

const abusiveTotal = Object.values(abusive).flat().length;

console.log(`\nabusive sentences (${abusiveTotal}): ` +
  `${counts.abusive.explicit} rejected by the vectors, ${counts.abusive.unsure} sent to the LLM, ` +
  `${counts.abusive.clean} missed`);

console.log(`clean sentences (${clean.length}): ` +
  `${counts.clean.clean} passed, ${counts.clean.unsure} sent to the LLM, ` +
  `${counts.clean.explicit} wrongly rejected`);
