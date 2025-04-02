import path from "path";
import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import { LocalStorage } from "../../middlewares";
import envConfig from "../../config";

class LoggerService {
  logger: winston.Logger | undefined;

  initLogger() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || "debug",
      format: winston.format.combine(
        winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        winston.format.json(),
        winston.format.colorize({ all: true })
      ),
      transports: [
        envConfig.ENVIRONMENT === "development"
          ? new winston.transports.Console()
          : new DailyRotateFile({
              filename: path.join(__dirname, `../../../logs/app.log`), // Log to file // using root path
              maxSize: "20m", // Max file size: 20MB
              maxFiles: "14d", // Keep last 14 days log files
            }),
      ],
    });
  }

  template({
    where,
    message,
    traceId,
  }: {
    where: string;
    message: string;
    traceId: string | undefined;
  }) {
    return `where:${where} - ${message} - ${traceId ? traceId : "no traceId"}`;
  }

  getTimestamp() {
    return new Date().toISOString();
  }

  getTraceId() {
    return LocalStorage.getTraceId();
  }

  info({ where, message }: { where: string; message: string }) {
    const traceId = this.getTraceId();
    this.logger?.info(this.template({ where, message, traceId }));
  }

  error({ where, message }: { where: string; message: string }) {
    const traceId = this.getTraceId();
    this.logger?.error(this.template({ where, message, traceId }));
  }

  debug({ where, message }: { where: string; message: string }) {
    const traceId = this.getTraceId();
    this.logger?.debug(this.template({ where, message, traceId }));
  }

  warn({ where, message }: { where: string; message: string }) {
    const traceId = this.getTraceId();
    this.logger?.warn(this.template({ where, message, traceId }));
  }
}

export default new LoggerService();
