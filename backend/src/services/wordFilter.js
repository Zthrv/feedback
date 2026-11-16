import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { createMatcher } from "../utils/wordMatcher.js";

const here = path.dirname(fileURLToPath(import.meta.url));

const { block, roots, phrases } = JSON.parse(
  fs.readFileSync(path.join(here, "..", "..", "ml", "profanity.json"), "utf8")
);

const blockLists = { block, roots, phrases };

const matcher = createMatcher(blockLists);

class WordFilter {

  // The lists the browser needs to warn while the sender is typing
  static getBlockLists() {
    return blockLists;
  }

  // The blocked word found in the text (as typed), or null
  static findBlockedWord(text) {
    return matcher.find(text);
  }

  // Text in a script other than Latin (Hindi, Arabic...), which the English models cannot read
  static hasOtherScript(text) {
    return /(?=\p{L})\P{Script=Latin}/u.test(text);
  }

}

export default WordFilter;
