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
// login would disappear. If BOOTSTRAP_USERNAME_1/BOOTSTRAP_PASSWORD_1 (etc.)
// are set, recreate each of those logins on boot whenever it's missing.
async function bootstrapAdminUsers() {
  for (const { username, password } of env.BOOTSTRAP_USERS) {
    const existing = userRepository.findByUsername(username);
    if (existing) continue;

    const passwordHash = await hashPassword(password);
    userRepository.create({ username, passwordHash });
    logger.info(`Bootstrap user "${username}" created from environment variables`);
  }
}

async function main() {
  adminRepository.syncFromEnv(env.ADMIN_IDS);
  await bootstrapAdminUsers();

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
