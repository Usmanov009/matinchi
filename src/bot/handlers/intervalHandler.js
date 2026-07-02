import { intervalKeyboard } from "../keyboards/intervalKeyboard.js";
import { authGuard } from "../middlewares/authGuard.js";
import { intervalService } from "../../services/intervalService.js";
import { postingService } from "../../services/postingService.js";

export function registerIntervalHandler(bot) {
  bot.hears("⏰ Interval", authGuard, async (ctx) => {
    await ctx.reply("⏰ Reklama har necha minutda yuborilsin?", { reply_markup: intervalKeyboard });
  });

  bot.callbackQuery(/^interval_(5|10)$/, authGuard, async (ctx) => {
    const minutes = Number(ctx.match[1]);
    const userId = ctx.session.dbUserId;

    intervalService.setInterval(userId, minutes);
    if (postingService.isRunning(userId)) {
      postingService.start(userId);
    }

    await ctx.answerCallbackQuery();
    await ctx.editMessageText(`✅ Interval ${minutes} minut qilib belgilandi.`);
  });
}
