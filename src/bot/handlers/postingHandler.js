import { authGuard } from "../middlewares/authGuard.js";
import { postingService } from "../../services/postingService.js";
import { groupService } from "../../services/groupService.js";
import { campaignService } from "../../services/campaignService.js";
import { telegramAccountService } from "../../services/telegramAccountService.js";

export function registerPostingHandler(bot) {
  bot.hears("▶️ Start Posting", authGuard, async (ctx) => {
    const userId = ctx.session.dbUserId;

    if (!telegramAccountService.hasLinkedAccount(userId)) {
      await ctx.reply("❌ Avval Telegram akkauntingizni ulang.");
      return;
    }
    if (groupService.selected(userId).length === 0) {
      await ctx.reply("❌ Avval kamida bitta guruh tanlang.");
      return;
    }
    if (!campaignService.getActive(userId)) {
      await ctx.reply("❌ Avval reklama matnini yuboring.");
      return;
    }
    if (postingService.isRunning(userId)) {
      await ctx.reply("ℹ️ Posting allaqachon ishlamoqda.");
      return;
    }

    postingService.start(userId);
    await ctx.reply("▶️ Posting ishga tushirildi!");
  });

  bot.hears("⛔️ Stop Posting", authGuard, async (ctx) => {
    const userId = ctx.session.dbUserId;
    if (!postingService.isRunning(userId)) {
      await ctx.reply("ℹ️ Posting hozircha ishlamayapti.");
      return;
    }

    postingService.stop(userId);
    await ctx.reply("⛔️ Posting to'xtatildi.");
  });
}
