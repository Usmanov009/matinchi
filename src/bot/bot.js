import { Bot, session } from "grammy";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { initialSession } from "./context.js";
import { registerStartHandler } from "./handlers/startHandler.js";
import { registerLoginHandler } from "./handlers/loginHandler.js";
import { registerTelegramAccountHandler } from "./handlers/telegramAccountHandler.js";
import { registerGroupsHandler } from "./handlers/groupsHandler.js";
import { registerAdvertisementHandler } from "./handlers/advertisementHandler.js";
import { registerIntervalHandler } from "./handlers/intervalHandler.js";
import { registerPostingHandler } from "./handlers/postingHandler.js";
import { registerLogoutHandler } from "./handlers/logoutHandler.js";
import { registerAdminHandlers } from "./handlers/adminHandlers.js";

export function createBot() {
  const bot = new Bot(env.BOT_TOKEN);

  bot.use(session({ initial: initialSession }));

  registerAdminHandlers(bot);
  registerStartHandler(bot);
  registerLoginHandler(bot);
  registerTelegramAccountHandler(bot);
  registerGroupsHandler(bot);
  registerAdvertisementHandler(bot);
  registerIntervalHandler(bot);
  registerPostingHandler(bot);
  registerLogoutHandler(bot);

  bot.catch((err) => {
    const updateId = err.ctx?.update?.update_id;
    const message = err.error?.message ?? err.message;
    logger.error(`Bot error for update ${updateId}: ${message}`);
  });

  return bot;
}
