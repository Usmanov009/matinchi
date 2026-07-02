import { db } from "../db/database.js";
import { userRepository } from "../repositories/userRepository.js";
import { logRepository } from "../repositories/logRepository.js";
import { hashPassword } from "../utils/password.js";
import { postingService } from "./postingService.js";

export const adminService = {
  async createUser(username, password) {
    const passwordHash = await hashPassword(password);
    return userRepository.create({ username, passwordHash });
  },

  blockUser(userId) {
    userRepository.setActive(userId, false);
    if (postingService.isRunning(userId)) postingService.stop(userId);
  },

  unblockUser(userId) {
    userRepository.setActive(userId, true);
  },

  deleteUser(userId) {
    if (postingService.isRunning(userId)) postingService.stop(userId);
    userRepository.delete(userId);
  },

  listUsers() {
    return userRepository.findAll();
  },

  recentLogs(limit = 20) {
    return logRepository.findRecent(limit);
  },

  stats() {
    const totalUsers = userRepository.countAll();
    const activeUsers = userRepository.countActive();
    const totalGroups = db.prepare(`SELECT COUNT(*) AS c FROM groups WHERE selected = 1`).get().c;
    const totalCampaigns = db.prepare(`SELECT COUNT(*) AS c FROM campaigns WHERE is_active = 1`).get().c;
    const runningPosting = db.prepare(`SELECT COUNT(*) AS c FROM users WHERE posting_active = 1`).get().c;
    return { totalUsers, activeUsers, totalGroups, totalCampaigns, runningPosting };
  },
};
