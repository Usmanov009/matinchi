import { db } from "../db/database.js";

export const sessionRepository = {
  upsert({ userId, phoneNumber, sessionEncrypted }) {
    const existing = this.findByUserId(userId);
    if (existing) {
      db.prepare(
        `UPDATE sessions SET phone_number = ?, session_encrypted = ?, updated_at = datetime('now') WHERE user_id = ?`
      ).run(phoneNumber, sessionEncrypted, userId);
    } else {
      db.prepare(
        `INSERT INTO sessions (user_id, phone_number, session_encrypted) VALUES (?, ?, ?)`
      ).run(userId, phoneNumber, sessionEncrypted);
    }
    return this.findByUserId(userId);
  },

  findByUserId(userId) {
    return db.prepare(`SELECT * FROM sessions WHERE user_id = ?`).get(userId);
  },

  deleteByUserId(userId) {
    db.prepare(`DELETE FROM sessions WHERE user_id = ?`).run(userId);
  },
};
