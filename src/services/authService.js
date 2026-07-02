import { userRepository } from "../repositories/userRepository.js";
import { verifyPassword } from "../utils/password.js";
import { logRepository } from "../repositories/logRepository.js";

export const authService = {
  findByTelegramId(telegramId) {
    return userRepository.findByTelegramId(telegramId);
  },

  async login(username, password, telegramId) {
    const user = userRepository.findByUsername(username);
    if (!user || !user.active) {
      return { success: false, reason: "not_found" };
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      logRepository.add(user.id, "warn", "Noto'g'ri login urinishi");
      return { success: false, reason: "invalid_password" };
    }

    userRepository.linkTelegramId(user.id, telegramId);
    logRepository.add(user.id, "info", "Foydalanuvchi tizimga kirdi");
    return { success: true, user };
  },

  logout(userId) {
    userRepository.unlinkTelegramId(userId);
    logRepository.add(userId, "info", "Foydalanuvchi tizimdan chiqdi");
  },
};
