// Finds blocked words in a piece of text, including disguised spellings.
// This file exists twice, with identical contents: backend/src/utils and frontend/src/utils.
// The browser uses it to warn while typing, the server uses it to decide. Change both together.

const LEET = {
  0: "o", 1: "i", 3: "e", 4: "a", 5: "s", 7: "t", "@": "a", $: "s", "!": "i",
};

// * # and _ each stand in for one hidden letter, as in "f*ck"
const MASK = /[*#_]/;

/**
 * The ways one typed word could be read once symbols are turned back into letters:
 * "sh1t" -> "shit", "a$$" -> "ass", "fuuuck" -> "fuck", "ass!" -> "ass", "*shit*" -> "shit"
 */
function spellings(token) {

  const forms = new Set([
    token,
    token.replace(/!+$/, ""),
    token.replace(/^[*#_]+|[*#_]+$/g, ""),
  ]);

  const result = new Set();

  for (const form of forms) {

    if (!form) {
      continue;
    }

    const plain = form.replace(/[013457@$!]/g, (char) => LEET[char]);

    result.add(plain);
    result.add(plain.replace(/(.)\1{2,}/g, "$1$1"));
    result.add(plain.replace(/(.)\1{2,}/g, "$1"));

  }

  return [...result];

}

/**
 * Split text into lower-case words, keeping the symbols people use to disguise letters.
 * Pieces without any letter (numbers, "***") are dropped, so "455" is never read as "ass".
 */
function tokenize(text) {

  return text
    .toLowerCase()
    .split(/[^a-z0-9@$!*#_]+/)
    .filter((token) => /[a-z]/.test(token));

}

/**
 * Build a matcher from the word lists.
 * matcher.find(text) returns the offending word as it was typed, or null.
 */
function createMatcher({ block = [], roots = [], phrases = [] }) {

  const blocked = new Set(block);

  const byLength = new Map();

  for (const word of blocked) {

    if (!byLength.has(word.length)) {
      byLength.set(word.length, []);
    }

    byLength.get(word.length).push(word);

  }

  function isBlocked(token) {

    for (const candidate of spellings(token)) {

      if (MASK.test(candidate)) {

        // Needs a real first letter and at least three characters: "f***", "s**t", "b*tch"
        if (candidate.length < 3 || !/^[a-z]/.test(candidate) || /[^a-z*#_]/.test(candidate)) {
          continue;
        }

        const pattern = new RegExp(`^${candidate.replace(/[*#_]/g, ".")}$`);

        if ((byLength.get(candidate.length) || []).some((word) => pattern.test(word))) {
          return true;
        }

        continue;

      }

      if (
        blocked.has(candidate) ||
        // A plural s, but not a word ending in "ss": "dicks" yes, "assess" no
        (/[^s]s$/.test(candidate) && blocked.has(candidate.slice(0, -1))) ||
        roots.some((root) => candidate.includes(root))
      ) {
        return true;
      }

    }

    return false;

  }

  function find(text) {

    const value = String(text || "");

    for (const token of tokenize(value)) {
      if (isBlocked(token)) {
        return token;
      }
    }

    // Letters spelled out one at a time: "f u c k", "s.h.i.t", "a-s-s"
    const spaced = value
      .toLowerCase()
      .match(/(?<![a-z0-9])(?:[a-z0-9@$!*][ .\-_]){2,}[a-z0-9@$!*](?![a-z0-9])/g) || [];

    for (const piece of spaced) {

      const joined = piece.replace(/[ .\-_]/g, "");

      if (/[a-z]/.test(joined) && isBlocked(joined)) {
        return piece;
      }

    }

    const flat = ` ${value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()} `;

    return phrases.find((phrase) => flat.includes(` ${phrase} `)) || null;

  }

  return { find, isBlocked };

}

export { createMatcher, spellings, tokenize };
