import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { env } from "../../config/env.js";
import { authGuard } from "../middlewares/authGuard.js";
import { campaignService } from "../../services/campaignService.js";
import { mainMenu } from "../keyboards/mainMenu.js";
import { logger } from "../../utils/logger.js";

const MEDIA_DIR = path.resolve("media");

function ensureMediaDir() {
  if (!fs.existsSync(MEDIA_DIR)) fs.mkdirSync(MEDIA_DIR, { recursive: true });
}

async function downloadTelegramFile(ctx, fileId, extension) {
  ensureMediaDir();
  const file = await ctx.api.getFile(fileId);
  const url = `https://api.telegram.org/file/bot${env.BOT_TOKEN}/${file.file_path}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Faylni yuklab bo'lmadi: ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  const filePath = path.join(MEDIA_DIR, `${crypto.randomUUID()}.${extension}`);
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

export function registerAdvertisementHandler(bot) {
  bot.hears("📢 Advertisement", authGuard, async (ctx) => {
    ctx.session.step = "ad_content";
    ctx.session.adTemp = { contentType: null, text: null, caption: null, mediaPath: null };
    await ctx.reply(
      "📢 Reklama matnini yuboring.\n\nMatn, yoki caption bilan rasm/video yuborishingiz mumkin."
    );
  });

  bot.on(["message:text", "message:photo", "message:video"], authGuard, async (ctx, next) => {
    if (ctx.session.step === "ad_content") {
      try {
        if (ctx.message.photo) {
          const largest = ctx.message.photo[ctx.message.photo.length - 1];
          const mediaPath = await downloadTelegramFile(ctx, largest.file_id, "jpg");
          ctx.session.adTemp = { contentType: "photo", caption: ctx.message.caption ?? "", mediaPath };
        } else if (ctx.message.video) {
          const mediaPath = await downloadTelegramFile(ctx, ctx.message.video.file_id, "mp4");
          ctx.session.adTemp = { contentType: "video", caption: ctx.message.caption ?? "", mediaPath };
        } else if (ctx.message.text) {
          ctx.session.adTemp = { contentType: "text", text: ctx.message.text };
        } else {
          await ctx.reply("❌ Faqat matn, rasm yoki video yuboring.");
          return;
        }
      } catch (err) {
        logger.error(`Ad media download failed: ${err.message}`);
        await ctx.reply(`❌ Faylni yuklashda xatolik: ${err.message}`);
        return;
      }

      ctx.session.step = "ad_button";
      await ctx.reply(
        "🔘 Tugma qo'shmoqchimisiz?\n\n" +
          "Agar ha bo'lsa 'Matn | URL' formatida yuboring.\n" +
          "Masalan: Bizning sayt | https://example.com\n\n" +
          "Agar kerak bo'lmasa 'Yo'q' deb yozing."
      );
      return;
    }

    if (ctx.session.step === "ad_button") {
      if (!ctx.message.text) {
        await ctx.reply("❌ Iltimos matn ko'rinishida javob bering.");
        return;
      }

      const raw = ctx.message.text.trim();
      let buttonText = null;
      let buttonUrl = null;

      if (!/^yo'?q$/i.test(raw)) {
        const parts = raw.split("|").map((p) => p.trim());
        if (parts.length !== 2 || !/^https?:\/\//i.test(parts[1])) {
          await ctx.reply(
            "❌ Format noto'g'ri. Masalan: Bizning sayt | https://example.com\nyoki 'Yo'q' deb yozing."
          );
          return;
        }
        [buttonText, buttonUrl] = parts;
      }

      const temp = ctx.session.adTemp;
      campaignService.save({
        userId: ctx.session.dbUserId,
        contentType: temp.contentType,
        text: temp.text ?? null,
        caption: temp.caption ?? null,
        mediaPath: temp.mediaPath ?? null,
        buttonText,
        buttonUrl,
      });

      ctx.session.step = "idle";
      ctx.session.adTemp = { contentType: null, text: null, caption: null, mediaPath: null };
      await ctx.reply("✅ Reklama saqlandi!", { reply_markup: mainMenu });
      return;
    }

    await next();
  });
}
