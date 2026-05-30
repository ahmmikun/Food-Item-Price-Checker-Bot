import { connectToWhatsApp } from "./base.js";
import { handlePriceCommand } from "./src/commands/price.commands.js";
import { loadPriceData } from "./src/services/priceData.service.js";
import fs from "fs";
import path from "path";

function loadLocalEnv() {
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadLocalEnv();

const SESSION_FOLDER = process.env.SESSION_FOLDER || "session";
const BOT_PHONE_NUMBER = process.env.BOT_PHONE_NUMBER || "";
const AUTOREAD = process.env.AUTOREAD !== "false";

function maskPhone(phoneNumber) {
  return String(phoneNumber || "").replace(/\d(?=\d{4})/g, "*") || "not set";
}

function logStartup() {
  console.log("========================================");
  console.log("PSBA Price WhatsApp Bot");
  console.log("Login: pairing code only");
  console.log(`Session: ${SESSION_FOLDER}`);
  console.log(`Phone: ${maskPhone(BOT_PHONE_NUMBER)}`);
  console.log("Commands: help, districts, items <district>, rate <item> <district>, top <district>");
  console.log("========================================");
}

logStartup();
loadPriceData();

try {
  const { sock, events } = await connectToWhatsApp({
    folder: SESSION_FOLDER,
    type_connection: "pairing",
    phoneNumber: BOT_PHONE_NUMBER,
    autoread: AUTOREAD,
  });

  sock.clearDirectory("tmp");
  console.log("Bot is connecting to WhatsApp...");

  events.on("connected", () => {
    console.log("Bot connected successfully.");
  });

  events.on("message", async (msg) => {
    try {
      const { remoteJid, sender, content, isQuoted, quotedMessage, message } = msg;
      if (!content || typeof content !== "string") return;

      console.log(`Message from ${sender}:`, content);

      const priceReply = handlePriceCommand(content);
      if (priceReply) {
        await sock.sendMessage(remoteJid, { text: priceReply });
        return;
      }

      const normalized = content.trim().toLowerCase().replace(/^[.!/#]+/, "");
      if (normalized === "ping") {
        await sock.sendMessage(remoteJid, { text: "Pong. PSBA Price Bot is online." });
        return;
      }

      if (isQuoted && quotedMessage) {
        const quotedPath = await sock.downloadQuotedMedia(message);
        if (quotedPath) console.log("Quoted media saved:", quotedPath);
      }
    } catch (err) {
      console.error("Error handling message:", err.message);
    }
  });

  events.on("call", ({ from }) => {
    console.log("Incoming call from:", from);
  });

  events.on("group-update", (update) => {
    console.log("Group updated:", update);
  });

  events.on("disconnected", (reason) => {
    console.log("Disconnected:", reason);
  });
} catch (err) {
  console.error("Failed to connect bot:", err.message);
  process.exitCode = 1;
}
