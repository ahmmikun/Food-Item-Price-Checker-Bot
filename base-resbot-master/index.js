import { connectToWhatsApp, sessions, serializeMessage } from "./base.js";
import { handlePriceCommand } from "./src/commands/price.commands.js";
import { loadPriceData } from "./src/services/priceData.service.js";

// Load price data on startup
loadPriceData();

try {
  const { sock, events } = await connectToWhatsApp({
    folder: "session",
    type_connection: "pairing", // atau "qr"
    phoneNumber: "923184070915",
    autoread: true,
  });

  // Bersihkan cache files
  sock.clearDirectory("tmp");

  console.log("🚀 Bot sedang menghubungkan ke WhatsApp...");

  // 📡 Event: ketika koneksi berhasil
  events.on("connected", () => console.log("✅ Bot berhasil terhubung!"));

  // 💬 Event: pesan masuk
  events.on("message", async (msg) => {
    try {
      const {
        id,
        remoteJid,
        sender,
        content,
        type,
        isQuoted,
        quotedMessage,
        message,
        m,
      } = msg;

      console.log(`💬 Pesan dari ${sender}:`, content);

      // --- Price Bot Commands ---
      const priceReply = handlePriceCommand(content);
      if (priceReply) {
        await sock.sendMessage(remoteJid, { text: priceReply });
        return;
      }

      // --- Existing bot commands ---
      if (content == "ping") {
        await sock.sendMessage(remoteJid, {
          text: "Pong 👋 ini pesan otomatis dari bot!",
        });
        return;
      }

      // Jika pesan berisi media (contoh: gambar)
      if (type === "image") {
        const mediaPath = await sock.downloadMedia(message);
        if (mediaPath) console.log("📥 Gambar tersimpan di:", mediaPath);

        await sock.sendMessage(remoteJid, {
          image: { url: mediaPath },
          caption: "Ini contoh gambar dari bot 🖼️",
        });
      }

      // Jika pesan membalas media lain
      if (isQuoted && quotedMessage) {
        const quotedPath = await sock.downloadQuotedMedia(message);
        if (quotedPath) console.log("📥 Media quoted tersimpan di:", quotedPath);
      }
    } catch (err) {
      console.error("⚠️ Error handling message:", err.message);
    }
  });

  // 📞 Event: panggilan masuk
  events.on("call", ({ from }) =>
    console.log("📞 Panggilan masuk dari:", from)
  );

  // 👥 Event: grup diperbarui (member join/leave, nama, dll)
  events.on("group-update", (update) =>
    console.log("👥 Grup diperbarui:", update)
  );

  // ❌ Event: koneksi terputus
  events.on("disconnected", (reason) =>
    console.log("❌ Koneksi terputus:", reason)
  );
} catch (err) {
  console.error("❗ Gagal menghubungkan bot:", err.message);
}
