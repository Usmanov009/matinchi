import { authService } from "../../services/authService.js";
import { env } from "../../config/env.js";
import { mainMenu } from "../keyboards/mainMenu.js";

export function registerLoginHandler(bot) {
  bot.on("message:text", async (ctx, next) => {
    if (ctx.session.step === "login_username") {
      ctx.session.loginTemp = { username: ctx.message.text.trim() };
      ctx.session.step = "login_password";
      await ctx.reply("🔑 Parolni kiriting:");
      return;
    }

    if (ctx.session.step === "login_password") {
      const username = ctx.session.loginTemp?.username;
      const password = ctx.message.text.trim();
      const result = await authService.login(username, password, ctx.from.id);

      if (!result.success) {
        ctx.session.step = "login_username";
        ctx.session.loginTemp = { username: null };
        await ctx.reply("❌ Login yoki parol noto'g'ri\n\n🔐 Login (foydalanuvchi nomi)ni qaytadan kiriting:");
        return;
      }

      ctx.session.isLoggedIn = true;
      ctx.session.dbUserId = result.user.id;
      ctx.session.isAdmin = env.ADMIN_IDS.includes(ctx.from.id);
      ctx.session.step = "idle";
      await ctx.reply("✅ Muvaffaqiyatli kirildi", { reply_markup: mainMenu });
      return;
    }

    await next();
  });
}
