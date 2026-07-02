import { authGuard } from "../middlewares/authGuard.js";
import { authService } from "../../services/authService.js";

export function registerLogoutHandler(bot) {
  bot.hears("🚪 Logout", authGuard, async (ctx) => {
    authService.logout(ctx.session.dbUserId);
    ctx.session.isLoggedIn = false;
    ctx.session.dbUserId = null;
    ctx.session.step = "idle";
    await ctx.reply("👋 Tizimdan chiqdingiz. Qayta kirish uchun /start ni bosing.", {
      reply_markup: { remove_keyboard: true },
    });
  });
}
