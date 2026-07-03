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

  /**
   * Tears down a pending login attempt and waits for the client to fully
   * disconnect before returning. This must complete before a new client for
   * the same chat starts, otherwise the abandoned client can still be mid-flight
   * (e.g. about to call sendCode) and race with the new one — which invalidates
   * both codes and throws "Cannot send requests while disconnected".
   */
  async cancelLogin(chatId) {
    const pending = pendingLogins.get(chatId);
    if (!pending) return;

    pending.cancelled = true;
    if (pending.codeDeferred) pending.codeDeferred.reject(new Error("cancelled"));
    if (pending.passwordDeferred) pending.passwordDeferred.reject(new Error("cancelled"));
    pendingLogins.delete(chatId);

    try {
      await pending.client.destroy();
    } catch {
      // already disconnected/destroyed — nothing to do
    }
  },

  /**
   * Kicks off an interactive GramJS login. The phoneCode/password callbacks only
   * resolve once submitCode()/submitPassword() are called from the bot's message
   * handlers, so this function's returned promise only resolves once the previous
   * attempt (if any) has been fully cancelled — completion of the login itself is
   * reported via the onSuccess/onError callbacks.
   */
  async startLogin(chatId, userId, phoneNumber, { onCodeRequested, onPasswordRequested, onSuccess, onError }) {
    await this.cancelLogin(chatId);

    const client = createClient();
    const pending = {
      client,
      codeDeferred: null,
      passwordDeferred: null,
      codeAttempts: 0,
      passwordAttempts: 0,
      cancelled: false,
    };
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
          if (pending.cancelled) return true;
          logger.error(`GramJS auth error (chat ${chatId}): ${err.message}`);

          // Stop retrying on auth failures that won't recover by immediate retry.
          // This prevents infinite retry loops on invalid phone numbers, invalid
          // codes, and server-side wait penalties.
          const fatalErrors = new Set([
            "PHONE_CODE_EXPIRED",
            "PHONE_NUMBER_INVALID",
            "PHONE_CODE_INVALID",
            "PHONE_NUMBER_BANNED",
            "PHONE_NUMBER_FLOOD",
            "AUTH_USER_CANCEL",
          ]);

          if (fatalErrors.has(err.errorMessage)) return true;
          if (err.message?.includes("A wait of") || err.message?.includes("wait of")) return true;
          if (err.errorMessage === "AUTH_USER_CANCEL" || err.message?.includes("cancelled")) return true;

          return false;
        },
      })
      .then(async () => {
        if (pending.cancelled) return;

        const sessionString = client.session.save();
        const encrypted = encrypt(sessionString);
        sessionRepository.upsert({ userId, phoneNumber, sessionEncrypted: encrypted });
        activeClients.set(userId, client);
        if (pendingLogins.get(chatId) === pending) pendingLogins.delete(chatId);
        logRepository.add(userId, "info", "Telegram akkaunt muvaffaqiyatli ulandi");
        await onSuccess();
      })
      .catch(async (err) => {
        if (pending.cancelled) return;

        if (pendingLogins.get(chatId) === pending) pendingLogins.delete(chatId);
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
