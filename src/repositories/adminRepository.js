import { db } from "../db/database.js";

export const adminRepository = {
  syncFromEnv(telegramIds) {
    const insert = db.prepare(`INSERT OR IGNORE INTO admins (telegram_id) VALUES (?)`);
    const tx = db.transaction((ids) => {
      for (const id of ids) insert.run(id);
    });
    tx(telegramIds);
  },

  isAdmin(telegramId) {
    return !!db.prepare(`SELECT 1 FROM admins WHERE telegram_id = ?`).get(telegramId);
  },

  findAll() {
    return db.prepare(`SELECT * FROM admins`).all();
  },
};
