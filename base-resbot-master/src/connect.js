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

// Inisialisasi logger dan event bus global
const logger = pino({ level: "silent" });
const eventBus = new EventEmitter();
const store = { contacts: {} };

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Fungsi utama untuk menghubungkan ke WhatsApp via Baileys.
 *
 * @param {object} options
 * @param {string} [options.folder="session"] - Nama folder penyimpanan session.
 * @param {string} [options.phoneNumber] - Nomor bot (jika mode pairing).
 * @param {string} [options.type_connection="qr"] - Jenis koneksi ("qr" atau "pairing").
 * @param {boolean} [options.autoread=true] - Apakah pesan otomatis dibaca.
 * @returns {Promise<{sock: any, events: EventEmitter}>}
 */
export default async function connectToWhatsApp({
  folder = "session",
  phoneNumber = null,
  type_connection = "qr",
  autoread = true,
} = {}) {
  const sessionDir = path.join(process.cwd(), folder);
  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger,
    printQRInTerminal: false,
    auth: state,
    browser: ["Ubuntu", "Chrome", "20.0.04"],
  });

  sessions.set(folder, sock);

  sock.downloadMedia = downloadMedia;
  sock.downloadQuotedMedia = downloadQuotedMedia;
  sock.clearDirectory = clearDirectory;

  // Pairing mode
  if (
    !sock.authState.creds.registered &&
    type_connection.toLowerCase() === "pairing"
  ) {
    if (!phoneNumber) {
      throw new Error("Nomor telepon wajib diisi untuk mode pairing!");
    }

    await delay(4000);
    const code = await sock.requestPairingCode(phoneNumber.trim());
    const formattedCode = code.slice(0, 4) + "-" + code.slice(4);
    console.log(chalk.blue("PHONE NUMBER:"), chalk.yellow(phoneNumber));
    console.log(chalk.blue("PAIRING CODE:"), chalk.yellow(formattedCode));
  }

  sock.ev.on("creds.update", saveCreds);

  try {
    setupSessionDirectory(sessionDir);
  } catch (err) {
    console.log(chalk.red("Gagal setup direktori session:", err.message));
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

      if (autoread) await sock.readMessages([result.message.key]);
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

    if (qr && type_connection === "qr") {
      qrcode.generate(qr, { small: true });
      success("QR", "Silakan scan QR melalui aplikasi WhatsApp!");
    }

    if (connection === "open") {
      eventBus.emit("connected", sock);
    } else if (connection === "close") {
      const reason = new Boom(lastDisconnect?.error)?.output.statusCode;
      eventBus.emit("disconnected", reason);

      // Auto reconnect dengan delay
      await delay(3000);
      return connectToWhatsApp({
        folder,
        phoneNumber,
        type_connection,
        autoread,
      });
    }
  });

  return { sock, events: eventBus };
}
