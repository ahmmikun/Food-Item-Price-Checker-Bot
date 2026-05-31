import { connectToWhatsApp, sessions } from "./base.js";
import { handlePriceCommand } from "./commands/price.commands.js";
import { loadPriceData } from "./services/priceData.service.js";
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
    const value = trimmed
      .slice(separator + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadLocalEnv();

const SESSION_FOLDER = process.env.SESSION_FOLDER || "session";
const BOT_PHONE_NUMBER = process.env.BOT_PHONE_NUMBER || "";
const CONNECTION_TYPE = process.env.CONNECTION_TYPE || "pairing";
const AUTOREAD = process.env.AUTOREAD !== "false";

function maskPhone(phoneNumber) {
  return String(phoneNumber || "").replace(/\d(?=\d{4})/g, "*") || "not set";
}

function logStartup() {
  console.log("========================================");
  console.log("PSBA Price WhatsApp Bot");
  console.log(`Login: ${CONNECTION_TYPE}`);
  console.log(`Session: ${SESSION_FOLDER}`);
  console.log(
    `Phone: ${CONNECTION_TYPE === "pairing" ? maskPhone(BOT_PHONE_NUMBER) : "N/A (QR mode)"}`
  );
  console.log(
    "Commands: help, districts, items <district>, rate <item> <district>, top <district>"
  );
  console.log("========================================");
}

logStartup();
loadPriceData();

/**
 * Send a structured response (text or image) to a WhatsApp chat.
 * Falls back to text-only if image sending fails.
 * Uses the latest socket from sessions cache to handle reconnections.
 */
async function sendReply(jid, response) {
  if (!response) return;

  // Always get the latest socket from sessions cache (handles reconnections)
  const activeSock = sessions.get(SESSION_FOLDER);
  if (!activeSock) {
    console.error("No active socket available, cannot send reply");
    return;
  }

  if (response.type === "image") {
    try {
      await activeSock.sendMessage(jid, {
        image: { url: response.imageUrl },
        caption: response.caption,
      });
    } catch (err) {
      console.error("Failed to send image, falling back to text:", err.message);
      try {
        await activeSock.sendMessage(jid, { text: response.caption });
      } catch (fallbackErr) {
        console.error("Failed to send fallback text:", fallbackErr.message);
      }
    }
  } else {
    try {
      await activeSock.sendMessage(jid, { text: response.text });
    } catch (err) {
      console.error("Failed to send text reply:", err.message);
    }
  }
}

try {
  const { sock, events } = await connectToWhatsApp({
    folder: SESSION_FOLDER,
    type_connection: CONNECTION_TYPE,
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
      const { remoteJid, sender, content, isQuoted, quotedMessage, message } =
        msg;
      if (!content || typeof content !== "string") return;

      console.log(`Message from ${sender}:`, content);

      const priceReply = handlePriceCommand(content);
      if (priceReply) {
        await sendReply(remoteJid, priceReply);
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
