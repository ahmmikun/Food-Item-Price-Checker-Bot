import { createLogger, format, transports } from "winston";
import DailyRotateFile from "winston-daily-rotate-file";

const logger = createLogger({
  level: "info",
  format: format.combine(
    format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    format.printf(
      ({ timestamp, level, message }) =>
        `[${timestamp}] ${level.toUpperCase()}: ${message}`
    )
  ),
  transports: [
    new DailyRotateFile({
      filename: "logs/bot-activity-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      maxSize: "10m", // Maksimal ukuran file log 10MB
      maxFiles: "14d", // Simpan log selama 14 hari
    }),
  ],
});

// Fungsi kustom untuk mencatat log
function logCustom(level, message, filename = null) {
  if (filename) {
    // Buat logger sementara untuk file yang ditentukan
    const tempLogger = createLogger({
      level: level,
      format: format.combine(
        format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        format.printf(
          ({ timestamp, level, message }) =>
            `[${timestamp}] ${level.toUpperCase()}: ${message}`
        )
      ),
      transports: [
        new transports.File({
          filename: `logs/${filename}`, // Buat atau gunakan file log yang sudah ada
          level: level,
        }),
      ],
    });

    // Gunakan logger sementara untuk mencatat log
    tempLogger.log(level, message);
  } else {
    // Gunakan logger utama jika tidak ada filename
    logger.log(level, message);
  }
}

export { logger, logCustom };
