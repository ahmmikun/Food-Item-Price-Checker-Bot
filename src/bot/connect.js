import fs from "fs";
import path from "path";
import chalk from "chalk";
import qrcode from "qrcode-terminal";
import pino from "pino";
import { Boom } from "@hapi/boom";
import EventEmitter from "events";
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} from "baileys";

import { sessions } from "./libs/cache.js";
import serializeMessage from "./libs/serializeMessage.js";
import {
  setupSessionDirectory,
  success,
  danger,
  deleteFolderRecursive,
  downloadQuotedMedia,
  downloadMedia,
  clearDirectory,
} from "./libs/utils.js";

const logger = pino({ level: "silent" });
const eventBus = new EventEmitter();
const store = { contacts: {} };
const reconnectState = new Map();

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function normalizePhoneNumber(phoneNumber) {
  return String(phoneNumber || "").replace(/\D/g, "");
}

function getReconnectDelay(folder) {
  const current = reconnectState.get(folder) || 0;
  const next = Math.min(current + 1, 8);
  reconnectState.set(folder, next);
  return Math.min(30000, 2000 * next);
}

/**
 * Connect to WhatsApp via Baileys.
 *
 * @param {object} options
 * @param {string} [options.folder="session"] - Session storage folder.
 * @param {string} [options.phoneNumber] - Bot number (for pairing mode).
 * @param {string} [options.type_connection="pairing"] - Connection type ("qr" or "pairing").
 * @param {boolean} [options.autoread=true] - Auto-read messages.
 * @returns {Promise<{sock: any, events: EventEmitter}>}
 */
export default async function connectToWhatsApp({
  folder = "session",
  phoneNumber = null,
  type_connection = "pairing",
  autoread = true,
} = {}) {
  const connectionType = String(type_connection || "pairing").toLowerCase();
  const normalizedPhone = normalizePhoneNumber(phoneNumber);

  if (!["pairing", "qr"].includes(connectionType)) {
    throw new Error("CONNECTION_TYPE must be 'pairing' or 'qr'.");
  }

  const sessionDir = path.join(process.cwd(), folder);
  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
  const { version } = await fetchLatestBaileysVersion();
  console.log(
    chalk.cyan("Using Baileys version:"),
    chalk.yellow(version.join("."))
  );

  const sock = makeWASocket({
    version,
    logger,
    printQRInTerminal: connectionType === "qr",
    auth: state,
    browser: ["PSBA Price Bot", "Chrome", "1.0.0"],
    markOnlineOnConnect: false,
    syncFullHistory: false,
  });

  sessions.set(folder, sock);

  sock.downloadMedia = downloadMedia;
  sock.downloadQuotedMedia = downloadQuotedMedia;
  sock.clearDirectory = clearDirectory;

  // Pairing code mode - request code if not registered
  if (!sock.authState.creds.registered && connectionType === "pairing") {
    if (!normalizedPhone) {
      throw new Error(
        "BOT_PHONE_NUMBER is required for pairing mode. Set it in .env or use CONNECTION_TYPE=qr"
      );
    }

    await delay(4000);
    const code = await sock.requestPairingCode(normalizedPhone);
    const formattedCode = code.slice(0, 4) + "-" + code.slice(4);
    console.log(chalk.blue("PHONE NUMBER:"), chalk.yellow(normalizedPhone));
    console.log(chalk.blue("PAIRING CODE:"), chalk.yellow(formattedCode));
  }

  sock.ev.on("creds.update", saveCreds);

  try {
    setupSessionDirectory(sessionDir);
  } catch (err) {
    console.log(chalk.red("Failed to setup session directory:", err.message));
  }

  /* ----------------------- CONTACTS UPDATE ----------------------- */
  sock.ev.on("contacts.update", (contacts) => {
    contacts.forEach((contact) => {
      store.contacts[contact.id] = contact;
    });
  });

  /* ----------------------- MESSAGE UPSERT ------------------------ */
  sock.ev.on("messages.upsert", async (m) => {
    try {
      const result = serializeMessage(m, sock);
      if (!result) return;

      if (autoread)
        await sock.readMessages([result.message.key]).catch(() => {});
      eventBus.emit("message", result);
    } catch (e) {
      console.log(chalk.red(`Error handling message: ${e.message}`));
    }
  });

  /* ------------------ GROUP PARTICIPANTS UPDATE ------------------ */
  sock.ev.on("group-participants.update", async (m) => {
    if (!m || !m.id || !m.participants || !m.action) {
      return;
    }

    const messageInfo = {
      id: m.id,
      participants: m.participants,
      action: m.action,
      store,
    };

    eventBus.emit("group-update", messageInfo);
  });

  /* --------------------------- CALL EVENT ------------------------ */
  sock.ev.on("call", async (calls) => {
    eventBus.emit("call", calls);
  });

  /* ---------------------- CONNECTION UPDATE ---------------------- */
  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr && connectionType === "qr") {
      qrcode.generate(qr, { small: true });
      console.log(chalk.green("Scan the QR code above with WhatsApp."));
    }

    if (connection === "open") {
      reconnectState.set(folder, 0);
      eventBus.emit("connected", sock);
    } else if (connection === "close") {
      const reason = new Boom(lastDisconnect?.error)?.output.statusCode;
      eventBus.emit("disconnected", reason);

      if (reason === DisconnectReason.loggedOut) {
        console.log(
          chalk.red("Session logged out. Delete the session folder and pair again.")
        );
        return;
      }

      const waitMs = getReconnectDelay(folder);
      console.log(
        chalk.yellow(`Reconnecting in ${Math.round(waitMs / 1000)}s...`)
      );
      await delay(waitMs);
      return connectToWhatsApp({
        folder,
        phoneNumber: normalizedPhone,
        type_connection: connectionType,
        autoread,
      });
    }
  });

  return { sock, events: eventBus };
}
