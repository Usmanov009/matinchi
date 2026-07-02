import { authService } from "../../services/authService.js";

export async function authGuard(ctx, next) {
  if (!ctx.session.isLoggedIn) {
    const user = ctx.from ? authService.findByTelegramId(ctx.from.id) : null;
    if (user && user.active) {
      ctx.session.isLoggedIn = true;
      ctx.session.dbUserId = user.id;
    } else {
      await ctx.reply("🔐 Iltimos avval /start buyrug'i orqali tizimga kiring.");
      return;
    }
  }
  await next();
}
