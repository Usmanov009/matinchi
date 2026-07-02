import cron from "node-cron";
import { Api } from "telegram";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { sleep } from "../utils/sleep.js";
import { userRepository } from "../repositories/userRepository.js";
import { groupRepository } from "../repositories/groupRepository.js";
import { campaignRepository } from "../repositories/campaignRepository.js";
import { logRepository } from "../repositories/logRepository.js";
import { telegramAccountService } from "./telegramAccountService.js";
import { scheduledTasks, postingLocks } from "../runtime/state.js";

function buildButtons(campaign) {
  if (!campaign.button_text || !campaign.button_url) return undefined;
  return new Api.ReplyInlineMarkup({
    rows: [
      new Api.KeyboardButtonRow({
        buttons: [new Api.KeyboardButtonUrl({ text: campaign.button_text, url: campaign.button_url })],
      }),
    ],
  });
}

// Telegram only allows real bots to attach inline keyboards to messages — a
// regular user account (GramJS) sending with reply_markup gets rejected by
// the server. We try native buttons first, and if the server rejects them we
// fall back to appending the link as plain text so the ad still goes out.
function appendLinkAsText(baseText, campaign) {
  const linkLine = `🔗 ${campaign.button_text}: ${campaign.button_url}`;
  return baseText ? `${baseText}\n\n${linkLine}` : linkLine;
}

async function sendToGroup(client, groupId, campaign) {
  const isMedia = campaign.content_type === "photo" || campaign.content_type === "video";
  const baseText = isMedia ? campaign.caption ?? "" : campaign.text ?? "";
  const buttons = buildButtons(campaign);

  try {
    if (isMedia) {
      await client.sendFile(groupId, { file: campaign.media_path, caption: baseText, buttons });
    } else {
      await client.sendMessage(groupId, { message: baseText, buttons });
    }
  } catch (err) {
    const isButtonRejection = buttons && /BUTTON|MARKUP|BOT_REQUIRED/i.test(err.message ?? "");
    if (!isButtonRejection) throw err;

    const fallbackText = appendLinkAsText(baseText, campaign);
    if (isMedia) {
      await client.sendFile(groupId, { file: campaign.media_path, caption: fallbackText });
    } else {
      await client.sendMessage(groupId, { message: fallbackText });
    }
  }
}

async function runPostingCycle(userId) {
  if (postingLocks.has(userId)) {
    logger.warn(`Posting cycle skipped for user ${userId}: previous cycle still running`);
    return;
  }

  postingLocks.add(userId);
  try {
    const campaign = campaignRepository.findActiveByUser(userId);
    const groups = groupRepository.findSelectedByUser(userId);

    if (!campaign || groups.length === 0) {
      logger.warn(`Posting cycle skipped for user ${userId}: missing campaign or groups`);
      return;
    }

    const client = await telegramAccountService.getClient(userId);
    if (!client) {
      logger.error(`Posting cycle aborted for user ${userId}: no linked Telegram account`);
      logRepository.add(userId, "error", "Reklama yuborilmadi: Telegram akkaunt ulanmagan");
      return;
    }

    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      try {
        await sendToGroup(client, group.group_id, campaign);
        logRepository.add(userId, "info", `Reklama yuborildi: ${group.title}`);
      } catch (err) {
        logger.error(`Failed to send to group ${group.title} (user ${userId}): ${err.message}`);
        logRepository.add(userId, "error", `Yuborilmadi (${group.title}): ${err.message}`);
      }

      if (i < groups.length - 1) {
        await sleep(env.GROUP_POST_DELAY_MS);
      }
    }
  } finally {
    postingLocks.delete(userId);
  }
}

export const postingService = {
  start(userId) {
    if (scheduledTasks.has(userId)) {
      this.stop(userId);
    }

    const user = userRepository.findById(userId);
    const minutes = Math.max(1, user?.interval_minutes ?? 5);
    const cronExpression = `*/${minutes} * * * *`;

    const task = cron.schedule(cronExpression, () => {
      runPostingCycle(userId).catch((err) => {
        logger.error(`Posting cycle error for user ${userId}: ${err.message}`);
      });
    });

    scheduledTasks.set(userId, task);
    userRepository.setPostingActive(userId, true);
    logRepository.add(userId, "info", `Posting ishga tushirildi (har ${minutes} daqiqada)`);

    runPostingCycle(userId).catch((err) => {
      logger.error(`Initial posting cycle error for user ${userId}: ${err.message}`);
    });
  },

  stop(userId) {
    const task = scheduledTasks.get(userId);
    if (task) {
      task.stop();
      scheduledTasks.delete(userId);
    }
    userRepository.setPostingActive(userId, false);
    logRepository.add(userId, "info", "Posting to'xtatildi");
  },

  isRunning(userId) {
    return scheduledTasks.has(userId);
  },
};
