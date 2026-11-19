// Prints a bcrypt hash for a password typed at the prompt. The password is hidden while typed
// and never stored in this file. Usage: npm run hash-password

import bcrypt from "bcrypt";
import { createInterface } from "readline/promises";

import AuthService from "../src/services/authService.js";

const rl = createInterface({ input: process.stdin, output: process.stdout });
process.stdout.write("Password: ");
rl._writeToOutput = () => {}; // hide what is typed
const password = await rl.question("");
rl.close();
process.stdout.write("\n");

try {
  AuthService.validatePassword(password);
  console.log(await bcrypt.hash(password, 10));
} catch (error) {
  console.error(`❌ ${error.message}`);
  process.exitCode = 1;
}
