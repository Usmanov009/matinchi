import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";
import "./db/database.js";
import { adminRepository } from "./repositories/adminRepository.js";
import { userRepository } from "./repositories/userRepository.js";
import { hashPassword } from "./utils/password.js";
import { createBot } from "./bot/bot.js";
import { startHealthServer } from "./web/healthServer.js";

// On platforms with an ephemeral filesystem (e.g. Render's free tier), the
// SQLite file is wiped on every redeploy/restart, so any manually created
// login would disappear. If BOOTSTRAP_USERNAME/BOOTSTRAP_PASSWORD are set,
// recreate that login on boot whenever it's missing.
async function bootstrapAdminUser() {
  if (!env.BOOTSTRAP_USERNAME || !env.BOOTSTRAP_PASSWORD) return;

  const existing = userRepository.findByUsername(env.BOOTSTRAP_USERNAME);
  if (existing) return;

  const passwordHash = await hashPassword(env.BOOTSTRAP_PASSWORD);
  userRepository.create({ username: env.BOOTSTRAP_USERNAME, passwordHash });
  logger.info(`Bootstrap user "${env.BOOTSTRAP_USERNAME}" created from environment variables`);
}

async function main() {
  adminRepository.syncFromEnv(env.ADMIN_IDS);
  await bootstrapAdminUser();

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
