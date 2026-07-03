import { InlineKeyboard } from "grammy";

export const intervalKeyboard = new InlineKeyboard()
  .text("3 minut", "interval_3")
  .text("5 minut", "interval_5")
  .row()
  .text("10 minut", "interval_10")
  .text("15 minut", "interval_15");
