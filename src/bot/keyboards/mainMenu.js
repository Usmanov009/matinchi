import { Keyboard } from "grammy";

export const mainMenu = new Keyboard()
  .text("🔗 Telegram Account")
  .text("👥 Groups")
  .row()
  .text("📢 Advertisement")
  .text("⏰ Interval")
  .row()
  .text("▶️ Start Posting")
  .text("⛔️ Stop Posting")
  .row()
  .text("🚪 Logout")
  .resized();
