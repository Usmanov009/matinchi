import { db } from "../db/database.js";

export const userRepository = {
  create({ username, passwordHash }) {
    const stmt = db.prepare(`INSERT INTO users (username, password_hash) VALUES (?, ?)`);
    const info = stmt.run(username, passwordHash);
    return this.findById(info.lastInsertRowid);
  },

  findById(id) {
    return db.prepare(`SELECT * FROM users WHERE id = ?`).get(id);
  },

  findByUsername(username) {
    return db.prepare(`SELECT * FROM users WHERE username = ?`).get(username);
  },

  findByTelegramId(telegramId) {
    return db.prepare(`SELECT * FROM users WHERE telegram_id = ?`).get(telegramId);
  },

  linkTelegramId(userId, telegramId) {
    db.prepare(`UPDATE users SET telegram_id = ? WHERE id = ?`).run(telegramId, userId);
  },

  unlinkTelegramId(userId) {
    db.prepare(`UPDATE users SET telegram_id = NULL WHERE id = ?`).run(userId);
  },

  setActive(userId, active) {
    db.prepare(`UPDATE users SET active = ? WHERE id = ?`).run(active ? 1 : 0, userId);
  },

  delete(userId) {
    db.prepare(`DELETE FROM users WHERE id = ?`).run(userId);
  },

  setInterval(userId, minutes) {
    db.prepare(`UPDATE users SET interval_minutes = ? WHERE id = ?`).run(minutes, userId);
  },

  setPostingActive(userId, active) {
    db.prepare(`UPDATE users SET posting_active = ? WHERE id = ?`).run(active ? 1 : 0, userId);
  },

  findAll() {
    return db.prepare(`SELECT * FROM users ORDER BY id DESC`).all();
  },

  countAll() {
    return db.prepare(`SELECT COUNT(*) AS count FROM users`).get().count;
  },

  countActive() {
    return db.prepare(`SELECT COUNT(*) AS count FROM users WHERE active = 1`).get().count;
  },
};
