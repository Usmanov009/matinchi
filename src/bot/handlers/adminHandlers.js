import { InlineKeyboard } from "grammy";
import { adminOnly } from "../middlewares/adminMiddleware.js";
import { adminService } from "../../services/adminService.js";

function formatUserRow(u) {
  const status = u.active ? "✅ Faol" : "🚫 Bloklangan";
  const tg = u.telegram_id ? "🔗 ulangan" : "❌ ulanmagan";
  return `#${u.id} ${u.username} — ${status} — Telegram: ${tg} — Posting: ${u.posting_active ? "▶️" : "⛔️"}`;
}

function userActionsKeyboard(user) {
  return new InlineKeyboard()
    .text(user.active ? "🚫 Block" : "✅ Unblock", `admin_toggle_${user.id}`)
    .text("🗑 Delete", `admin_delete_${user.id}`);
}

export function registerAdminHandlers(bot) {
  bot.command("stats", adminOnly, async (ctx) => {
    const s = adminService.stats();
    await ctx.reply(
      `📊 Statistika\n\n` +
        `👤 Jami foydalanuvchilar: ${s.totalUsers}\n` +
        `✅ Faol foydalanuvchilar: ${s.activeUsers}\n` +
        `👥 Tanlangan guruhlar: ${s.totalGroups}\n` +
        `📢 Faol reklamalar: ${s.totalCampaigns}\n` +
        `▶️ Ishlayotgan posting: ${s.runningPosting}`
    );
  });

  bot.command("users", adminOnly, async (ctx) => {
    const users = adminService.listUsers();
    if (users.length === 0) {
      await ctx.reply("Foydalanuvchilar mavjud emas.");
      return;
    }
    for (const u of users) {
      await ctx.reply(formatUserRow(u), { reply_markup: userActionsKeyboard(u) });
    }
  });

  bot.command("logs", adminOnly, async (ctx) => {
    const logs = adminService.recentLogs(20);
    if (logs.length === 0) {
      await ctx.reply("Loglar mavjud emas.");
      return;
    }
    const text = logs
      .map((l) => `[${l.created_at}] (${l.username ?? "system"}) ${l.level.toUpperCase()}: ${l.message}`)
      .join("\n");
    await ctx.reply(text.slice(0, 4000));
  });

  bot.command("newuser", adminOnly, async (ctx) => {
    const parts = ctx.message.text.split(" ").slice(1);
    if (parts.length !== 2) {
      await ctx.reply("Foydalanish: /newuser <login> <parol>");
      return;
    }
    const [username, password] = parts;
    try {
      const user = await adminService.createUser(username, password);
      await ctx.reply(`✅ Yangi foydalanuvchi yaratildi: ${user.username} (id: ${user.id})`);
    } catch (err) {
      await ctx.reply(`❌ Xatolik: ${err.message}`);
    }
  });

  bot.callbackQuery(/^admin_toggle_(\d+)$/, adminOnly, async (ctx) => {
    const id = Number(ctx.match[1]);
    const users = adminService.listUsers();
    const user = users.find((u) => u.id === id);
    if (!user) {
      await ctx.answerCallbackQuery({ text: "Topilmadi" });
      return;
    }

    if (user.active) {
      adminService.blockUser(id);
    } else {
      adminService.unblockUser(id);
    }

    const updated = adminService.listUsers().find((u) => u.id === id);
    await ctx.editMessageText(formatUserRow(updated), { reply_markup: userActionsKeyboard(updated) });
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery(/^admin_delete_(\d+)$/, adminOnly, async (ctx) => {
    const id = Number(ctx.match[1]);
    adminService.deleteUser(id);
    await ctx.editMessageText(`🗑 Foydalanuvchi #${id} o'chirildi.`);
    await ctx.answerCallbackQuery();
  });
}
