import { telegramAccountService } from "../../services/telegramAccountService.js";
import { authGuard } from "../middlewares/authGuard.js";
import { mainMenu } from "../keyboards/mainMenu.js";
import { logger } from "../../utils/logger.js";

const FRIENDLY_ERRORS = {
  PHONE_CODE_EXPIRED:
    "❌ Tasdiqlash kodining muddati tugadi. Iltimos, 🔗 Telegram Account tugmasini qaytadan bosib, yangi kod so'rang.",
  PHONE_CODE_INVALID: "❌ Kod noto'g'ri kiritildi. 🔗 Telegram Account tugmasini qaytadan bosib, qaytadan urinib ko'ring.",
  PHONE_NUMBER_INVALID: "❌ Telefon raqami noto'g'ri. 🔗 Telegram Account tugmasini qaytadan bosib, to'g'ri raqam kiriting.",
  PHONE_NUMBER_BANNED: "❌ Ushbu telefon raqami Telegram tomonidan cheklangan. Iltimos, boshqa raqamdan urinib ko'ring.",
  PHONE_NUMBER_FLOOD: "❌ Telefon raqamiga kod juda tez so'ralmoqda. Bir necha daqiqadan so'ng qaytadan urinib ko'ring.",
  AUTH_USER_CANCEL: "❌ Telegram avtorizatsiya bekor qilindi. Agar qayta ulash kerak bo'lsa, 🔗 Telegram Account tugmasini qaytadan bosing.",
  "wait of": "❌ Telegram serveri vaqtinchalik kutishni talab qilmoqda. Iltimos, birozdan so'ng qayta urinib ko'ring.",
  PASSWORD_HASH_INVALID: "❌ 2FA parol noto'g'ri. 🔗 Telegram Account tugmasini qaytadan bosib, qaytadan urinib ko'ring.",
};

function friendlyErrorMessage(err) {
  const code = err.errorMessage ?? Object.keys(FRIENDLY_ERRORS).find((key) => err.message?.includes(key));
  return FRIENDLY_ERRORS[code] ?? `❌ Ulanishda xatolik: ${err.message}`;
}

export function registerTelegramAccountHandler(bot) {
  bot.hears("🔗 Telegram Account", authGuard, async (ctx) => {
    if (telegramAccountService.hasLinkedAccount(ctx.session.dbUserId)) {
      await ctx.reply(
        "ℹ️ Telegram akkaunt allaqachon ulangan. Qayta ulash uchun telefon raqamingizni yuboring."
      );
    } else {
      await ctx.reply("📱 Telefon raqamingizni xalqaro formatda yuboring (masalan: +998901234567):");
    }
    ctx.session.step = "tg_phone";
  });

  bot.on("message:text", authGuard, async (ctx, next) => {
    const step = ctx.session.step;

    if (step === "tg_phone") {
      const phone = ctx.message.text.trim();
      if (!/^\+\d{7,15}$/.test(phone)) {
        await ctx.reply("❌ Noto'g'ri format. Telefon raqamni + bilan boshlab yuboring (masalan: +998901234567):");
        return;
      }

      ctx.session.tgTemp = { phone };
      const chatId = ctx.chat.id;
      const userId = ctx.session.dbUserId;

      await ctx.reply("⏳ Kod so'ralmoqda, biroz kuting...");

      telegramAccountService.startLogin(chatId, userId, phone, {
        onCodeRequested: async (isRetry) => {
          ctx.session.step = "tg_code";
          const text = isRetry
            ? "❌ Kod noto'g'ri. Qaytadan tasdiqlash kodini kiriting:"
            : "📩 Telegram'dan kelgan tasdiqlash kodini kiriting:";
          await ctx.api.sendMessage(chatId, text);
        },
        onPasswordRequested: async (isRetry) => {
          ctx.session.step = "tg_password";
          const text = isRetry
            ? "❌ Parol noto'g'ri. Qaytadan 2FA parolingizni kiriting:"
            : "🔒 Ikki bosqichli parolingizni (2FA) kiriting:";
          await ctx.api.sendMessage(chatId, text);
        },
        onSuccess: async () => {
          ctx.session.step = "idle";
          await ctx.api.sendMessage(chatId, "✅ Telegram akkaunt muvaffaqiyatli ulandi!", {
            reply_markup: mainMenu,
          });
        },
        onError: async (err) => {
          ctx.session.step = "idle";
          logger.error(`Telegram account link failed: ${err.message}`);
          await ctx.api.sendMessage(chatId, friendlyErrorMessage(err), { reply_markup: mainMenu });
        },
      });
      return;
    }

    if (step === "tg_code") {
      const ok = telegramAccountService.submitCode(ctx.chat.id, ctx.message.text.trim());
      await ctx.reply(ok ? "⏳ Tekshirilmoqda..." : "⏳ Iltimos biroz kuting...");
      return;
    }

    if (step === "tg_password") {
      const ok = telegramAccountService.submitPassword(ctx.chat.id, ctx.message.text.trim());
      await ctx.reply(ok ? "⏳ Tekshirilmoqda..." : "⏳ Iltimos biroz kuting...");
      return;
    }

    await next();
  });
}
