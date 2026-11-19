// Gives every account that has no password its own random one. Accounts that already have a
// password are never touched. Only the bcrypt hash is saved; the passwords are printed once, here.
// Usage: npm run set-passwords

import crypto from "crypto";
import bcrypt from "bcrypt";

import pool from "../src/config/database.js";
import UserModel from "../src/models/UserModel.js";

try {
  const [users] = await pool.query("SELECT user_id, email FROM users WHERE password_hash IS NULL");
  const credentials = [];

  for (const { user_id, email } of users) {
    const password = crypto.randomBytes(18).toString("base64url"); // 24 random characters
    await UserModel.changePassword(user_id, await bcrypt.hash(password, 10));
    credentials.push({ email, password });
  }

  if (credentials.length) {
    console.log("Save these now; they are not shown again:");
    console.table(credentials);
  } else {
    console.log("Every account already has a password. Nothing changed.");
  }
} catch (error) {
  console.error(`❌ ${error.message}`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
