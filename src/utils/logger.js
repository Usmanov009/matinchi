import fs from "node:fs";
import path from "node:path";
import { env } from "../config/env.js";

if (!fs.existsSync(env.LOG_DIR)) {
  fs.mkdirSync(env.LOG_DIR, { recursive: true });
}

const combinedLogPath = path.join(env.LOG_DIR, "combined.log");
const errorLogPath = path.join(env.LOG_DIR, "error.log");

function timestamp() {
  return new Date().toISOString();
}

function writeToFile(filePath, line) {
  try {
    fs.appendFileSync(filePath, line + "\n");
  } catch (err) {
    console.error("Failed to write log file:", err.message);
  }
}

function format(level, message) {
  return `[${timestamp()}] [${level.toUpperCase()}] ${message}`;
}

export const logger = {
  info(message) {
    const line = format("info", message);
    console.log(line);
    writeToFile(combinedLogPath, line);
  },
  warn(message) {
    const line = format("warn", message);
    console.warn(line);
    writeToFile(combinedLogPath, line);
  },
  error(message) {
    const line = format("error", message);
    console.error(line);
    writeToFile(combinedLogPath, line);
    writeToFile(errorLogPath, line);
  },
};
