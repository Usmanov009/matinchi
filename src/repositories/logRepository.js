import { db } from "../db/database.js";

export const logRepository = {
  add(userId, level, message) {
    db.prepare(`INSERT INTO logs (user_id, level, message) VALUES (?, ?, ?)`).run(
      userId ?? null,
      level,
      message
    );
  },

  findRecent(limit = 20) {
    return db
      .prepare(
        `SELECT logs.*, users.username FROM logs
         LEFT JOIN users ON users.id = logs.user_id
         ORDER BY logs.id DESC LIMIT ?`
      )
      .all(limit);
  },
};
