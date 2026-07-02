import { db } from "../db/database.js";

export const campaignRepository = {
  create({ userId, contentType, text, caption, mediaPath, buttonText, buttonUrl }) {
    const tx = db.transaction(() => {
      db.prepare(`UPDATE campaigns SET is_active = 0 WHERE user_id = ?`).run(userId);
      const info = db
        .prepare(
          `INSERT INTO campaigns (user_id, content_type, text, caption, media_path, button_text, button_url, is_active)
           VALUES (?, ?, ?, ?, ?, ?, ?, 1)`
        )
        .run(
          userId,
          contentType,
          text ?? null,
          caption ?? null,
          mediaPath ?? null,
          buttonText ?? null,
          buttonUrl ?? null
        );
      return info.lastInsertRowid;
    });
    const id = tx();
    return this.findById(id);
  },

  findById(id) {
    return db.prepare(`SELECT * FROM campaigns WHERE id = ?`).get(id);
  },

  findActiveByUser(userId) {
    return db
      .prepare(`SELECT * FROM campaigns WHERE user_id = ? AND is_active = 1 ORDER BY id DESC LIMIT 1`)
      .get(userId);
  },
};
