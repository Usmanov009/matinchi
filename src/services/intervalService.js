import { userRepository } from "../repositories/userRepository.js";

export const intervalService = {
  setInterval(userId, minutes) {
    userRepository.setInterval(userId, minutes);
  },

  getInterval(userId) {
    return userRepository.findById(userId)?.interval_minutes ?? 5;
  },
};
