import { db } from "../db/database.js";

export const groupRepository = {
  upsertMany(userId, groups) {
    const insert = db.prepare(`
      INSERT INTO groups (user_id, group_id, title, selected)
      VALUES (@userId, @groupId, @title, 0)
      ON CONFLICT(user_id, group_id) DO UPDATE SET title = excluded.title
    `);
    const tx = db.transaction((items) => {
      for (const g of items) {
        insert.run({ userId, groupId: String(g.id), title: g.title });
      }
    });
    tx(groups);
  },

  findAllByUser(userId) {
    return db.prepare(`SELECT * FROM groups WHERE user_id = ? ORDER BY title`).all(userId);
  },

  findSelectedByUser(userId) {
    return db
      .prepare(`SELECT * FROM groups WHERE user_id = ? AND selected = 1 ORDER BY title`)
      .all(userId);
  },

  toggleSelected(userId, groupId) {
    const row = db
      .prepare(`SELECT selected FROM groups WHERE user_id = ? AND group_id = ?`)
      .get(userId, groupId);
    if (!row) return;
    db.prepare(`UPDATE groups SET selected = ? WHERE user_id = ? AND group_id = ?`).run(
      row.selected ? 0 : 1,
      userId,
      groupId
    );
  },
};
