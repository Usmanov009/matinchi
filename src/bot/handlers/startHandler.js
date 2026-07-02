import { authService } from "../../services/authService.js";
import { env } from "../../config/env.js";
import { mainMenu } from "../keyboards/mainMenu.js";

export function registerStartHandler(bot) {
  bot.command("start", async (ctx) => {
    const telegramId = ctx.from.id;
    const user = authService.findByTelegramId(telegramId);

    if (user && user.active) {
      ctx.session.isLoggedIn = true;
      ctx.session.dbUserId = user.id;
      ctx.session.isAdmin = env.ADMIN_IDS.includes(telegramId);
      ctx.session.step = "idle";
      await ctx.reply(`✅ Xush kelibsiz, ${user.username}!`, { reply_markup: mainMenu });
      return;
    }

    ctx.session.isLoggedIn = false;
    ctx.session.dbUserId = null;
    ctx.session.step = "login_username";
    ctx.session.loginTemp = { username: null };
    await ctx.reply("🔐 Login (foydalanuvchi nomi)ni kiriting:");
  });
}
