import "dotenv/config";

function required(name) {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(
      `Environment variable ${name} is required but not set. Check your .env file (see .env.example).`
    );
  }
  return value;
}

const adminIds = (process.env.ADMIN_IDS ?? "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean)
  .map(Number);

export const env = {
  BOT_TOKEN: required("BOT_TOKEN"),
  TELEGRAM_API_ID: Number(required("TELEGRAM_API_ID")),
  TELEGRAM_API_HASH: required("TELEGRAM_API_HASH"),
  ENCRYPTION_KEY: required("ENCRYPTION_KEY"),
  ADMIN_IDS: adminIds,
  DB_PATH: process.env.DB_PATH ?? "./data/database.sqlite",
  LOG_DIR: process.env.LOG_DIR ?? "./logs",
  GROUP_POST_DELAY_MS: Number(process.env.GROUP_POST_DELAY_MS ?? 60000),
};

if (env.ENCRYPTION_KEY.length !== 64) {
  throw new Error(
    "ENCRYPTION_KEY must be a 64-character hex string (32 bytes) for AES-256-GCM. " +
      "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
  );
}

if (Number.isNaN(env.TELEGRAM_API_ID)) {
  throw new Error("TELEGRAM_API_ID must be a number.");
}

if (env.ADMIN_IDS.length === 0) {
  console.warn("[WARN] ADMIN_IDS is empty — no one will have admin access to this bot.");
}
