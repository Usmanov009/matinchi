import { campaignRepository } from "../repositories/campaignRepository.js";

export const campaignService = {
  save(data) {
    return campaignRepository.create(data);
  },

  getActive(userId) {
    return campaignRepository.findActiveByUser(userId);
  },
};
