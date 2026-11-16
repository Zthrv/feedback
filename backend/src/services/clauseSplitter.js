const MAX_CLAUSES = 8;

const MIN_WORDS = 3;

// Sentence ends, semicolons, and contrast words that usually start a new point
// ("you lead well, but your emails are unclear")
const BREAKS = /\s*;\s*|(?:,\s*)?\b(?:but|however|although|though|whereas)\b,?\s*/i;

function wordCount(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Cut feedback into clauses, each ideally about a single point,
 * so every clause can be matched to an attribute and judged on its own.
 */
function splitClauses(text) {

  const sentences = String(text)
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=[.!?])\s+/);

  const pieces = [];

  for (const sentence of sentences) {

    for (const piece of sentence.split(BREAKS)) {

      const clean = piece
        .trim()
        .replace(/^(?:and|so|also|plus)\s+/i, "")
        .replace(/[\s,;]+$/, "");

      if (clean) {
        pieces.push(clean);
      }

    }

  }

  // Fragments that are too short to mean anything join their neighbour
  const clauses = [];

  let carry = "";

  for (const piece of pieces) {

    const joined = carry ? `${carry} ${piece}` : piece;

    if (wordCount(joined) < MIN_WORDS) {
      carry = joined;
      continue;
    }

    clauses.push(joined);

    carry = "";

  }

  if (carry) {

    if (clauses.length > 0) {
      clauses[clauses.length - 1] += ` ${carry}`;
    } else {
      clauses.push(carry);
    }

  }

  return clauses.slice(0, MAX_CLAUSES);

}

export { splitClauses };
