import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";
import "./db/database.js";
import { adminRepository } from "./repositories/adminRepository.js";
import { createBot } from "./bot/bot.js";
import { startHealthServer } from "./web/healthServer.js";

async function main() {
  adminRepository.syncFromEnv(env.ADMIN_IDS);

  startHealthServer();

  const bot = createBot();

  process.on("SIGINT", async () => {
    logger.info("SIGINT received, stopping bot...");
    await bot.stop();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    logger.info("SIGTERM received, stopping bot...");
    await bot.stop();
    process.exit(0);
  });

  await bot.start({
    onStart: (info) => {
      logger.info(`Bot started as @${info.username}`);
    },
  });
}

main().catch((err) => {
  logger.error(`Fatal error on startup: ${err.stack ?? err.message}`);
  process.exit(1);
});
