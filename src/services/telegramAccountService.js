import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { encrypt, decrypt } from "../utils/crypto.js";
import { sessionRepository } from "../repositories/sessionRepository.js";
import { logRepository } from "../repositories/logRepository.js";
import { pendingLogins, activeClients } from "../runtime/state.js";

function createClient(sessionString = "") {
  return new TelegramClient(new StringSession(sessionString), env.TELEGRAM_API_ID, env.TELEGRAM_API_HASH, {
    connectionRetries: 5,
  });
}

export const telegramAccountService = {
  isLoginPending(chatId) {
    return pendingLogins.has(chatId);
  },

  cancelLogin(chatId) {
    const pending = pendingLogins.get(chatId);
    if (!pending) return;
    if (pending.codeDeferred) pending.codeDeferred.reject(new Error("cancelled"));
    if (pending.passwordDeferred) pending.passwordDeferred.reject(new Error("cancelled"));
    pending.client.destroy().catch(() => {});
    pendingLogins.delete(chatId);
  },

  /**
   * Kicks off an interactive GramJS login. The phoneCode/password callbacks only
   * resolve once submitCode()/submitPassword() are called from the bot's message
   * handlers, so this function returns immediately — completion is reported via
   * the onSuccess/onError callbacks.
   */
  startLogin(chatId, userId, phoneNumber, { onCodeRequested, onPasswordRequested, onSuccess, onError }) {
    if (pendingLogins.has(chatId)) {
      this.cancelLogin(chatId);
    }

    const client = createClient();
    const pending = { client, codeDeferred: null, passwordDeferred: null, codeAttempts: 0, passwordAttempts: 0 };
    pendingLogins.set(chatId, pending);

    client
      .start({
        phoneNumber: async () => phoneNumber,
        phoneCode: async () => {
          pending.codeAttempts += 1;
          await onCodeRequested(pending.codeAttempts > 1);
          return new Promise((resolve, reject) => {
            pending.codeDeferred = { resolve, reject };
          });
        },
        password: async () => {
          pending.passwordAttempts += 1;
          await onPasswordRequested(pending.passwordAttempts > 1);
          return new Promise((resolve, reject) => {
            pending.passwordDeferred = { resolve, reject };
          });
        },
        onError: async (err) => {
          logger.error(`GramJS auth error (chat ${chatId}): ${err.message}`);
          return false;
        },
      })
      .then(async () => {
        const sessionString = client.session.save();
        const encrypted = encrypt(sessionString);
        sessionRepository.upsert({ userId, phoneNumber, sessionEncrypted: encrypted });
        activeClients.set(userId, client);
        pendingLogins.delete(chatId);
        logRepository.add(userId, "info", "Telegram akkaunt muvaffaqiyatli ulandi");
        await onSuccess();
      })
      .catch(async (err) => {
        pendingLogins.delete(chatId);
        client.destroy().catch(() => {});
        logRepository.add(userId, "error", `Telegram login xatoligi: ${err.message}`);
        await onError(err);
      });
  },

  submitCode(chatId, code) {
    const pending = pendingLogins.get(chatId);
    if (!pending || !pending.codeDeferred) return false;
    const deferred = pending.codeDeferred;
    pending.codeDeferred = null;
    deferred.resolve(code.trim());
    return true;
  },

  submitPassword(chatId, password) {
    const pending = pendingLogins.get(chatId);
    if (!pending || !pending.passwordDeferred) return false;
    const deferred = pending.passwordDeferred;
    pending.passwordDeferred = null;
    deferred.resolve(password);
    return true;
  },

  async getClient(userId) {
    if (activeClients.has(userId)) {
      const client = activeClients.get(userId);
      if (!client.connected) await client.connect();
      return client;
    }

    const sessionRow = sessionRepository.findByUserId(userId);
    if (!sessionRow) return null;

    const sessionString = decrypt(sessionRow.session_encrypted);
    const client = createClient(sessionString);
    await client.connect();
    activeClients.set(userId, client);
    return client;
  },

  hasLinkedAccount(userId) {
    return !!sessionRepository.findByUserId(userId);
  },
};
