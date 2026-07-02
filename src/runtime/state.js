// In-memory runtime state shared across services. None of this is persisted —
// it only tracks live objects (GramJS clients, cron tasks, pending login flows)
// that cannot be serialized to SQLite.

// telegramChatId -> { client, codeDeferred, passwordDeferred }
export const pendingLogins = new Map();

// dbUserId -> connected GramJS TelegramClient
export const activeClients = new Map();

// dbUserId -> node-cron ScheduledTask
export const scheduledTasks = new Map();

// telegramChatId -> Array<{ id, title, group_id, selected }> (last fetched group list, for callback indexing)
export const groupsCache = new Map();

// dbUserId currently mid-cycle, prevents overlapping posting cycles
export const postingLocks = new Set();
