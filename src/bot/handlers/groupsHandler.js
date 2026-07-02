import { InlineKeyboard } from "grammy";
import { groupService } from "../../services/groupService.js";
import { authGuard } from "../middlewares/authGuard.js";
import { groupsCache } from "../../runtime/state.js";

function buildKeyboard(groups) {
  const kb = new InlineKeyboard();
  groups.forEach((g, index) => {
    const box = g.selected ? "☑️" : "☐";
    kb.text(`${box} ${g.title}`, `grp_toggle_${index}`).row();
  });
  kb.text("✅ Done", "grp_done");
  return kb;
}

export function registerGroupsHandler(bot) {
  bot.hears("👥 Groups", authGuard, async (ctx) => {
    const userId = ctx.session.dbUserId;
    await ctx.reply("⏳ Guruhlar ro'yxati olinmoqda...");

    let groups;
    try {
      groups = await groupService.fetchGroups(userId);
    } catch (err) {
      await ctx.reply(`❌ ${err.message}`);
      return;
    }

    if (groups.length === 0) {
      await ctx.reply("ℹ️ Sizning Telegram akkauntingizda group yoki supergroup topilmadi.");
      return;
    }

    groupsCache.set(ctx.chat.id, groups);
    await ctx.reply("👥 Guruhlarni tanlang:", { reply_markup: buildKeyboard(groups) });
  });

  bot.callbackQuery(/^grp_toggle_(\d+)$/, authGuard, async (ctx) => {
    const index = Number(ctx.match[1]);
    const groups = groupsCache.get(ctx.chat.id);
    if (!groups || !groups[index]) {
      await ctx.answerCallbackQuery({ text: "Ro'yxat eskirgan, qayta oching." });
      return;
    }

    const userId = ctx.session.dbUserId;
    groupService.toggle(userId, groups[index].group_id);

    const refreshed = groupService.listStored(userId);
    groupsCache.set(ctx.chat.id, refreshed);
    await ctx.editMessageReplyMarkup({ reply_markup: buildKeyboard(refreshed) });
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery("grp_done", authGuard, async (ctx) => {
    const userId = ctx.session.dbUserId;
    const selected = groupService.selected(userId);
    groupsCache.delete(ctx.chat.id);
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(
      `✅ Tanlangan guruhlar (${selected.length} ta):\n${selected.map((g) => `• ${g.title}`).join("\n") || "—"}`
    );
  });
}
