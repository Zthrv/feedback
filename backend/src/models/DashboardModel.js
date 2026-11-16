import pool from "../config/database.js";

class DashboardModel {
  // Statistics for every attribute, counting only feedback received by the given user
  static async getDashboardData(userId) {
    const [rows] = await pool.execute(
      `
      SELECT
          a.attribute_id,
          a.attribute_name,
          a.description,
          a.icon_name,
          COUNT(CASE WHEN fa.feedback_type = 'Positive' THEN 1 END) AS positive,
          COUNT(CASE WHEN fa.feedback_type = 'Negative' THEN 1 END) AS negative,
          COUNT(CASE WHEN fa.feedback_type = 'Neutral' THEN 1 END) AS neutral,
          COUNT(fa.feedback_id) AS total
      FROM attributes a
      LEFT JOIN (
          feedback_attributes fa
          INNER JOIN feedback f
          ON f.feedback_id = fa.feedback_id
          AND f.receiver_id = ?
      )
      ON a.attribute_id = fa.attribute_id
      GROUP BY
          a.attribute_id,
          a.attribute_name,
          a.description,
          a.icon_name,
          a.display_order
      ORDER BY
          a.display_order
      `,
      [userId]
    );

    return rows;
  }
}

export default DashboardModel;
