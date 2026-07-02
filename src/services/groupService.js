import { telegramAccountService } from "./telegramAccountService.js";
import { groupRepository } from "../repositories/groupRepository.js";

export const groupService = {
  async fetchGroups(userId) {
    const client = await telegramAccountService.getClient(userId);
    if (!client) {
      throw new Error("Telegram akkaunt ulanmagan. Avval 🔗 Telegram Account orqali ulang.");
    }

    const dialogs = await client.getDialogs({});
    const groups = [];

    for (const dialog of dialogs) {
      const entity = dialog.entity;
      if (!entity) continue;

      const isSupergroup = entity.className === "Channel" && entity.megagroup;
      const isBasicGroup = entity.className === "Chat";

      if (isSupergroup || isBasicGroup) {
        groups.push({
          id: dialog.id.toString(),
          title: dialog.title || entity.title || "Noma'lum guruh",
        });
      }
    }

    groupRepository.upsertMany(userId, groups);
    return groupRepository.findAllByUser(userId);
  },

  listStored(userId) {
    return groupRepository.findAllByUser(userId);
  },

  toggle(userId, groupId) {
    groupRepository.toggleSelected(userId, groupId);
  },

  selected(userId) {
    return groupRepository.findSelectedByUser(userId);
  },
};
