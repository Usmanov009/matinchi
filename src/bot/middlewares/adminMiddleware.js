import { env } from "../../config/env.js";

export async function adminOnly(ctx, next) {
  const telegramId = ctx.from?.id;
  if (!telegramId || !env.ADMIN_IDS.includes(telegramId)) {
    await ctx.reply("⛔️ Bu buyruq faqat administratorlar uchun.");
    return;
  }
  await next();
}
