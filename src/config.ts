import dotenv from "dotenv";
dotenv.config();

class EnvConfig {
  URL_CONFIG_ENCODE = {
    limit: "10mb",
    extended: true,
    parameterLimit: 50000,
  };

  RATE_LIMIT_OPTIONS = {
    windowMs: 1 * 60 * 1000, // 1 minutes
    max: 200, // Limit each IP to 100 requests per `window` (here, per 1 minutes)
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  };

  CORS_OPTIONS = {
    origin: process.env.CORS_URL || "*",
    methods: "GET,POST,PUT,PATCH,DELETE",
    allowedHeaders: "Content-Type,Authorization,X-Requested-With",
    // credentials: true // Allow credential
  };

  JSON_LIMIT = "10mb";

  ENVIRONMENT = process.env.NODE_ENV || "development";
  APP_PORT = process.env.APP_PORT || "8080";
  SOCKET_PORT = process.env.SOCKET_PORT || "8081";
  DB_USER = process.env.MONGO_INITDB_ROOT_USERNAME || "root";
  DB_PASSWORD = process.env.MONGO_INITDB_ROOT_PASSWORD || "root";
  DB_NAME = process.env.MONGO_DB_NAME || "chat-app";
  DB_HOST = process.env.MONGO_HOST || "localhost";
  DB_PORT = process.env.MONGO_PORT || "27017";
  MONGO_URL = `mongodb://${this.DB_USER}:${this.DB_PASSWORD}@${this.DB_HOST}:${this.DB_PORT}/${this.DB_NAME}?authsource=admin`;
  JWT_SECRET_ACCESS = process.env.JWT_SECRET_ACCESS || "secret";
  JWT_SECRET_REFRESH = process.env.JWT_SECRET_REFRESH || "secret123";
  GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "google-client-id";
  PASSWORD_KEY = process.env.PASSWORD_KEY || "password";
  ACCESS_TOKEN_TIME = process.env.ACCESS_TOKEN_VALIDITY_SEC || 1800000; // 30 minutes
  REFRESH_TOKEN_TIME = process.env.REFRESH_TOKEN_VALIDITY_SEC || "90d"; // 90 days
  REDIS_PORT = process.env.REDIS_PORT || 6379;
  REDIS_HOST = process.env.REDIS_HOST || "localhost";
  REDIS_URL = `redis://${this.REDIS_HOST}:${this.REDIS_PORT}`;
  LOG_DIR = process.env.LOG_DIR || "logs";
}

const envConfig = new EnvConfig();

export default envConfig;
