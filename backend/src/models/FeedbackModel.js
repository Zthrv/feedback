import pool from "../config/database.js";

const PAGE_SIZE = 20;

// First row of a query, or null
async function one(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows[0] || null;
}

// Run an UPDATE or DELETE and say whether it changed exactly one row
async function changedOne(sql, params) {
  const [result] = await pool.execute(sql, params);
  return result.affectedRows === 1;
}

// IDs of the feedback matching a fixed condition
async function idsWhere(condition) {
  const [rows] = await pool.query(
    `SELECT feedback_id FROM feedback WHERE ${condition} ORDER BY feedback_id`
  );
  return rows.map((row) => row.feedback_id);
}

// Run several statements as one transaction
async function transaction(work) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// Replace a feedback's tags
async function replaceTags(connection, feedbackId, tags) {
  await connection.execute("DELETE FROM feedback_attributes WHERE feedback_id = ?", [feedbackId]);

  for (const tag of tags) {
    await connection.execute(
      "INSERT INTO feedback_attributes (feedback_id, attribute_id, feedback_type) VALUES (?, ?, ?)",
      [feedbackId, tag.attribute.attribute_id, tag.feedbackType]
    );
  }
}

// Add each feedback's tags as `attributes`
async function withTags(feedbackRows) {
  if (feedbackRows.length === 0) return [];

  const [tags] = await pool.query(
    `
    SELECT fa.feedback_id, a.attribute_id, a.attribute_name, fa.feedback_type
    FROM feedback_attributes fa
    INNER JOIN attributes a ON a.attribute_id = fa.attribute_id
    WHERE fa.feedback_id IN (?)
    ORDER BY a.display_order
    `,
    [feedbackRows.map((row) => row.feedback_id)]
  );

  return feedbackRows.map((row) => ({
    ...row,
    attributes: tags
      .filter((tag) => tag.feedback_id === row.feedback_id)
      .map(({ feedback_id, ...tag }) => tag),
  }));
}

// One page of a list: { items, total, page, pageSize }
async function paginate({ select, from, where = "", params = [], orderBy, page }) {
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total ${from} ${where}`, params);

  const [items] = await pool.query(
    `${select} ${from} ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
    [...params, PAGE_SIZE, (page - 1) * PAGE_SIZE]
  );

  return { items, total, page, pageSize: PAGE_SIZE };
}

class FeedbackModel {

  static async getAttributes() {
    const [rows] = await pool.execute(
      "SELECT attribute_id, attribute_name, description FROM attributes ORDER BY display_order"
    );
    return rows;
  }

  // Employees who can receive feedback
  static async getRecipients(excludeUserId) {
    const [rows] = await pool.execute(
      `
      SELECT user_id, full_name, department, designation
      FROM users
      WHERE is_active = TRUE AND user_id <> ?
      ORDER BY full_name
      `,
      [excludeUserId]
    );
    return rows;
  }

  static async recipientExists(userId) {
    return Boolean(await one(
      "SELECT user_id FROM users WHERE user_id = ? AND is_active = TRUE LIMIT 1",
      [userId]
    ));
  }

  // Save feedback as 'pending' (hidden from the recipient until it is checked and tagged).
  // The sender is kept only until then, so a bounce can be counted for them.
  static async create({ receiverId, senderId, title, text }) {
    const [result] = await pool.execute(
      `
      INSERT INTO feedback (receiver_id, sender_id, feedback_title, feedback_text, classification_status)
      VALUES (?, ?, ?, ?, 'pending')
      `,
      [receiverId, senderId, title, text]
    );
    return result.insertId;
  }

  // Record abusive feedback for the admin. The sender is never stored.
  static async logAbuse({ receiverId, title, text, category = null, detectedBy }) {
    await pool.execute(
      `
      INSERT INTO abuse_log (receiver_id, feedback_title, feedback_text, category, detected_by)
      VALUES (?, ?, ?, ?, ?)
      `,
      [receiverId, title, text, category, detectedBy]
    );
  }

  // Move a feedback into the abuse log and delete it. `status` is the column that must
  // still be waiting, so the same feedback is never moved twice. True if it was moved.
  static moveToAbuseLog(feedbackId, status, { category = null, detectedBy, countBounce = false }) {
    const waiting = `feedback_id = ? AND ${status}`;

    return transaction(async (connection) => {
      if (countBounce) {
        // updated_at is set to itself so it does not record when this person's feedback bounced
        await connection.execute(
          `
          UPDATE users u
          INNER JOIN feedback f ON f.sender_id = u.user_id
          SET u.feedback_bounced = u.feedback_bounced + 1, u.last_feedback_status = 'bounced',
              u.updated_at = u.updated_at
          WHERE f.${waiting}
          `,
          [feedbackId]
        );
      }

      await connection.execute(
        `
        INSERT INTO abuse_log (receiver_id, feedback_title, feedback_text, category, detected_by)
        SELECT receiver_id, feedback_title, feedback_text, ?, ?
        FROM feedback
        WHERE ${waiting}
        `,
        [category, detectedBy, feedbackId]
      );

      const [deleted] = await connection.execute(`DELETE FROM feedback WHERE ${waiting}`, [feedbackId]);

      return deleted.affectedRows === 1;
    });
  }

  // Failed the background language check: never delivered, counted as bounced for the sender
  static bounce(feedbackId, { category, method }) {
    return this.moveToAbuseLog(feedbackId, "classification_status = 'pending'", {
      category,
      detectedBy: method,
      countBounce: true,
    });
  }

  // The recipient's abuse report was confirmed: the feedback is deleted
  static removeAsAbusive(feedbackId, category) {
    return this.moveToAbuseLog(feedbackId, "abuse_status = 'requested'", {
      category,
      detectedBy: "report",
    });
  }

  // The LLM could not classify it in time: it waits for an admin instead of being retried
  static sendToAdmin(feedbackId) {
    return changedOne(
      "UPDATE feedback SET classification_status = 'admin' WHERE feedback_id = ? AND classification_status = 'pending'",
      [feedbackId]
    );
  }

  // Feedback the LLM could not classify, waiting for an admin. The sender is never shown:
  // `sent_by_me` only tells the admin asking whether they wrote it themselves.
  static async getUnclassified(adminId) {
    const [rows] = await pool.execute(
      `
      SELECT
        f.feedback_id, f.feedback_title, f.feedback_text, f.receiver_id,
        u.full_name AS receiver_name,
        DATE_FORMAT(f.created_at, '%Y-%m-%d') AS received_on,
        (f.sender_id <=> ?) AS sent_by_me
      FROM feedback f
      INNER JOIN users u ON u.user_id = f.receiver_id
      WHERE f.classification_status = 'admin'
      ORDER BY f.feedback_id
      `,
      [adminId]
    );
    return rows.map((row) => ({ ...row, sent_by_me: Boolean(row.sent_by_me) }));
  }

  // `sent_by_me` is a yes/no for the admin asking; the sender's ID never leaves the database
  static async findUnclassified(feedbackId, adminId) {
    const row = await one(
      `
      SELECT feedback_id, receiver_id, (sender_id <=> ?) AS sent_by_me
      FROM feedback
      WHERE feedback_id = ? AND classification_status = 'admin'
      LIMIT 1
      `,
      [adminId, feedbackId]
    );
    return row && { ...row, sent_by_me: Boolean(row.sent_by_me) };
  }

  // The admin removed it: never delivered, counted as bounced for the sender. False if already decided.
  static removeUnclassified(feedbackId) {
    return this.moveToAbuseLog(feedbackId, "classification_status = 'admin'", {
      detectedBy: "admin",
      countBounce: true,
    });
  }

  // What a person can see about what they sent: two counts and how the last one went
  static async getSentSummary(userId) {
    const row = await one(
      `
      SELECT
        u.feedback_sent,
        u.feedback_bounced,
        u.last_feedback_status,
        (
          SELECT COUNT(*) FROM feedback f
          WHERE f.sender_id = u.user_id AND f.classification_status IN ('pending', 'admin')
        ) AS being_checked
      FROM users u
      WHERE u.user_id = ?
      LIMIT 1
      `,
      [userId]
    );

    return {
      sent: row.feedback_sent,
      bounced: row.feedback_bounced,
      last: row.being_checked > 0 ? "checking" : row.last_feedback_status,
    };
  }

  // Feedback waiting for each kind of background job
  static getPendingIds() {
    return idsWhere("classification_status = 'pending'");
  }

  static getReviewRequestedIds() {
    return idsWhere("review_status = 'requested'");
  }

  static getAbuseRequestedIds() {
    return idsWhere("abuse_status = 'requested'");
  }

  static findPendingById(feedbackId) {
    return one(
      `
      SELECT feedback_id, feedback_title, feedback_text
      FROM feedback
      WHERE feedback_id = ? AND classification_status = 'pending'
      LIMIT 1
      `,
      [feedbackId]
    );
  }

  // Store the tags and deliver the feedback: the sender gets one more "sent"
  // and is then erased from the feedback for good. `source` is "bert", "llm" or "admin";
  // `waiting` is the status it must still have ("pending", or "admin" for a hand-tagged one).
  // False if it was no longer waiting (already decided or deleted).
  static saveTags(feedbackId, tags, source, waiting = "pending") {
    return transaction(async (connection) => {
      // Lock the row so two admins deciding at once cannot both deliver it
      const [[feedback]] = await connection.execute(
        "SELECT feedback_id FROM feedback WHERE feedback_id = ? AND classification_status = ? FOR UPDATE",
        [feedbackId, waiting]
      );

      if (!feedback) return false;

      await replaceTags(connection, feedbackId, tags);

      // updated_at is set to itself so it does not record when this person's feedback went out
      await connection.execute(
        `
        UPDATE users u
        INNER JOIN feedback f ON f.sender_id = u.user_id
        SET u.feedback_sent = u.feedback_sent + 1, u.last_feedback_status = 'sent',
            u.updated_at = u.updated_at
        WHERE f.feedback_id = ?
        `,
        [feedbackId]
      );

      await connection.execute(
        `
        UPDATE feedback
        SET classification_status = 'done', classification_source = ?, sender_id = NULL
        WHERE feedback_id = ?
        `,
        [source, feedbackId]
      );

      return true;
    });
  }

  // Ask for a re-review: the recipient's own, classified feedback, once only
  static requestReview(feedbackId, userId) {
    return changedOne(
      `
      UPDATE feedback
      SET review_status = 'requested'
      WHERE feedback_id = ? AND receiver_id = ?
        AND classification_status = 'done' AND review_status IS NULL
      `,
      [feedbackId, userId]
    );
  }

  static async isReceivedBy(feedbackId, userId) {
    return Boolean(await one(
      "SELECT 1 FROM feedback WHERE feedback_id = ? AND receiver_id = ? LIMIT 1",
      [feedbackId, userId]
    ));
  }

  // Where a feedback stands, for its recipient only
  static findReviewState(feedbackId, userId) {
    return one(
      `
      SELECT classification_status, review_status, irrelevant_status
      FROM feedback
      WHERE feedback_id = ? AND receiver_id = ?
      LIMIT 1
      `,
      [feedbackId, userId]
    );
  }

  // One feedback waiting for a re-review, with the tags it has now
  static async findReviewRequested(feedbackId) {
    const feedback = await one(
      `
      SELECT feedback_id, feedback_title, feedback_text
      FROM feedback
      WHERE feedback_id = ? AND review_status = 'requested'
      LIMIT 1
      `,
      [feedbackId]
    );

    if (!feedback) return null;

    const [tags] = await pool.execute(
      "SELECT attribute_id, feedback_type FROM feedback_attributes WHERE feedback_id = ?",
      [feedbackId]
    );

    return { ...feedback, tags };
  }

  // Close a re-review. `tags` is null when the old tags were right and stay.
  static finishReview(feedbackId, tags) {
    return transaction(async (connection) => {
      if (tags) await replaceTags(connection, feedbackId, tags);

      await connection.execute(
        `
        UPDATE feedback
        SET review_status = 'done', classification_source = IF(?, 'llm', classification_source)
        WHERE feedback_id = ?
        `,
        [tags ? 1 : 0, feedbackId]
      );
    });
  }

  // A delivered feedback as its recipient may report it (null if it is not theirs)
  static findForAbuseReport(feedbackId, userId) {
    return one(
      `
      SELECT feedback_title, feedback_text, abuse_checked
      FROM feedback
      WHERE feedback_id = ? AND receiver_id = ? AND classification_status = 'done'
      LIMIT 1
      `,
      [feedbackId, userId]
    );
  }

  // Mark a feedback as reported, once. False if it already was.
  static claimAbuseCheck(feedbackId, userId) {
    return changedOne(
      `
      UPDATE feedback
      SET abuse_checked = TRUE, abuse_status = 'requested'
      WHERE feedback_id = ? AND receiver_id = ?
        AND classification_status = 'done' AND abuse_checked = FALSE
      `,
      [feedbackId, userId]
    );
  }

  static findAbuseRequested(feedbackId) {
    return one(
      `
      SELECT feedback_id, feedback_title, feedback_text
      FROM feedback
      WHERE feedback_id = ? AND abuse_status = 'requested'
      LIMIT 1
      `,
      [feedbackId]
    );
  }

  // The report was not confirmed: the feedback stays and cannot be reported again
  static async finishAbuseCheck(feedbackId) {
    await pool.execute(
      "UPDATE feedback SET abuse_status = 'done' WHERE feedback_id = ? AND abuse_status = 'requested'",
      [feedbackId]
    );
  }

  // Mark a feedback as reported irrelevant, once. False if it already was.
  static claimIrrelevantCheck(feedbackId, userId) {
    return changedOne(
      `
      UPDATE feedback
      SET irrelevant_status = 'requested'
      WHERE feedback_id = ? AND receiver_id = ?
        AND classification_status = 'done' AND irrelevant_status IS NULL
      `,
      [feedbackId, userId]
    );
  }

  // Feedback waiting for an admin's decision on its irrelevant report
  static async getIrrelevantReports() {
    const [rows] = await pool.execute(
      `
      SELECT
        f.feedback_id, f.feedback_title, f.feedback_text, f.receiver_id,
        u.full_name AS receiver_name,
        DATE_FORMAT(f.created_at, '%Y-%m-%d') AS received_on
      FROM feedback f
      INNER JOIN users u ON u.user_id = f.receiver_id
      WHERE f.irrelevant_status = 'requested'
      ORDER BY f.feedback_id
      `
    );
    return withTags(rows);
  }

  static findIrrelevantRequested(feedbackId) {
    return one(
      `
      SELECT feedback_id, receiver_id
      FROM feedback
      WHERE feedback_id = ? AND irrelevant_status = 'requested'
      LIMIT 1
      `,
      [feedbackId]
    );
  }

  // The admin kept the feedback. False if the report was already decided.
  static finishIrrelevantCheck(feedbackId) {
    return changedOne(
      "UPDATE feedback SET irrelevant_status = 'done' WHERE feedback_id = ? AND irrelevant_status = 'requested'",
      [feedbackId]
    );
  }

  // The admin removed the feedback. False if the report was already decided.
  static removeAsIrrelevant(feedbackId) {
    return changedOne(
      "DELETE FROM feedback WHERE feedback_id = ? AND irrelevant_status = 'requested'",
      [feedbackId]
    );
  }

  // Feedback received by a user, optionally limited to one attribute and/or type.
  // Only the day is returned, to make senders harder to guess.
  static async getReceived(userId, { attributeId, feedbackType } = {}) {
    // Pending feedback is hidden: it may still bounce
    const conditions = ["f.receiver_id = ?", "f.classification_status = 'done'"];
    const params = [userId];

    if (attributeId || feedbackType) {
      const tagConditions = ["fa.feedback_id = f.feedback_id"];

      if (attributeId) {
        tagConditions.push("fa.attribute_id = ?");
        params.push(attributeId);
      }

      if (feedbackType) {
        tagConditions.push("fa.feedback_type = ?");
        params.push(feedbackType);
      }

      conditions.push(
        `EXISTS (SELECT 1 FROM feedback_attributes fa WHERE ${tagConditions.join(" AND ")})`
      );
    }

    const [rows] = await pool.execute(
      `
      SELECT
        f.feedback_id, f.feedback_title, f.feedback_text, f.classification_status,
        f.review_status, f.abuse_checked, f.abuse_status, f.irrelevant_status,
        DATE_FORMAT(f.created_at, '%Y-%m-%d') AS received_on
      FROM feedback f
      WHERE ${conditions.join(" AND ")}
      ORDER BY f.created_at DESC, f.feedback_id DESC
      `,
      params
    );

    return withTags(rows);
  }

  // Admin: every delivered feedback, newest first. There is no sender to show.
  static async getAll({ page, receiverId }) {
    const result = await paginate({
      select: `
        SELECT
          f.feedback_id, f.feedback_title, f.feedback_text, f.receiver_id,
          u.full_name AS receiver_name,
          DATE_FORMAT(f.created_at, '%Y-%m-%d') AS received_on`,
      from: "FROM feedback f INNER JOIN users u ON u.user_id = f.receiver_id",
      where: `WHERE f.classification_status = 'done'${receiverId ? " AND f.receiver_id = ?" : ""}`,
      params: receiverId ? [receiverId] : [],
      orderBy: "f.created_at DESC, f.feedback_id DESC",
      page,
    });

    return { ...result, items: await withTags(result.items) };
  }

  // Admin: every feedback that was blocked or removed as abusive, newest first
  static getAbuseLog({ page, receiverId }) {
    return paginate({
      select: `
        SELECT
          l.log_id, l.receiver_id, u.full_name AS receiver_name,
          l.feedback_title, l.feedback_text, l.category, l.detected_by,
          DATE_FORMAT(l.removed_at, '%Y-%m-%d') AS removed_on`,
      from: "FROM abuse_log l INNER JOIN users u ON u.user_id = l.receiver_id",
      where: receiverId ? "WHERE l.receiver_id = ?" : "",
      params: receiverId ? [receiverId] : [],
      orderBy: "l.log_id DESC",
      page,
    });
  }

}

export default FeedbackModel;
