import pool from "../config/database.js";

class UserModel {
  static async findByEmail(email) {
    const [rows] = await pool.execute(
      `
      SELECT
        user_id,
        full_name,
        email,
        password_hash,
        department,
        designation,
        role,
        is_active,
        is_registered,
        token_version,
        created_at,
        updated_at
      FROM users
      WHERE email = ?
      LIMIT 1
      `,
      [email]
    );

    return rows[0] || null;
  }

  // The employee ID is left out on purpose: it is never sent to the browser
  static async findById(userId) {
    const [rows] = await pool.execute(
      `
      SELECT
        user_id,
        full_name,
        email,
        department,
        designation,
        role,
        is_active,
        is_registered,
        created_at,
        updated_at
      FROM users
      WHERE user_id = ?
      LIMIT 1
      `,
      [userId]
    );

    return rows[0] || null;
  }

  // Admin only. The account can log in straight away.
  // The employee ID is the next number after the highest one: EMP011 -> EMP012.
  static async create(user) {
    const [result] = await pool.execute(
      `
      INSERT INTO users
        (employee_id, full_name, email, password_hash,
         department, designation, role, is_active, is_registered)
      SELECT
        CONCAT('EMP', LPAD(COALESCE(MAX(CAST(SUBSTRING(employee_id, 4) AS UNSIGNED)), 0) + 1, 3, '0')),
        ?, ?, ?, ?, ?, ?, TRUE, TRUE
      FROM users
      WHERE employee_id REGEXP '^EMP[0-9]+$'
      `,
      [user.fullName, user.email, user.passwordHash, user.department, user.designation, user.role]
    );

    return result.insertId;
  }

  static async getEmployeeId(userId) {
    const [rows] = await pool.execute("SELECT employee_id FROM users WHERE user_id = ?", [userId]);
    return rows[0]?.employee_id || null;
  }

  // Raising token_version makes the auth middleware reject every token issued before now
  static async changePassword(userId, passwordHash) {
    const [result] = await pool.execute(
      `UPDATE users SET password_hash = ?, password_changed_at = NOW(), token_version = token_version + 1
       WHERE user_id = ?`,
      [passwordHash, userId]
    );

    return result;
  }

  // Signs the user out everywhere: every token issued so far stops working
  static async logout(userId) {
    const [result] = await pool.execute(
      "UPDATE users SET logged_out_at = NOW(), token_version = token_version + 1 WHERE user_id = ?",
      [userId]
    );

    return result;
  }

  // What the auth middleware needs to decide whether a token is still valid
  static async findAuthState(userId) {
    const [rows] = await pool.execute(
      `
      SELECT
        is_active,
        role,
        token_version,
        UNIX_TIMESTAMP(password_changed_at) AS password_changed_at
      FROM users
      WHERE user_id = ?
      LIMIT 1
      `,
      [userId]
    );

    return rows[0] || null;
  }

  static async findPasswordHashById(userId) {
    const [rows] = await pool.execute("SELECT password_hash FROM users WHERE user_id = ? LIMIT 1", [userId]);

    return rows[0]?.password_hash || null;
  }

  // One active token per user
  static async saveResetToken(userId, tokenHash, expiresInMinutes) {
    const [result] = await pool.execute(
      `
      INSERT INTO password_resets (user_id, token_hash, expires_at)
      VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))
      ON DUPLICATE KEY UPDATE
        token_hash = VALUES(token_hash),
        expires_at = VALUES(expires_at)
      `,
      [userId, tokenHash, expiresInMinutes]
    );

    return result;
  }

  // The user a still-valid reset token belongs to
  static async findUserIdByResetToken(tokenHash) {
    const [rows] = await pool.execute(
      "SELECT user_id FROM password_resets WHERE token_hash = ? AND expires_at > NOW() LIMIT 1",
      [tokenHash]
    );

    return rows[0]?.user_id || null;
  }

  static async deleteResetToken(userId) {
    const [result] = await pool.execute("DELETE FROM password_resets WHERE user_id = ?", [userId]);

    return result;
  }
}

export default UserModel;
