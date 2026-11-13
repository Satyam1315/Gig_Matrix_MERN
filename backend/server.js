import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { connectDatabase, disconnectDatabase } from "./config/database.js";
import api from "./routes/index.js";

const app = express();
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(root, ".env") });
const port = Number(process.env.PORT || 5000);

if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required.");
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET must be set to at least 32 characters.");
}

app.disable("x-powered-by");
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  credentials: true,
}));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));
app.use(cookieParser());
app.use("/uploads", express.static(path.join(path.dirname(fileURLToPath(import.meta.url)), "uploads"), { fallthrough: false }));
app.use("/api", api);

const builtClient = path.join(root, "dist");
if (fs.existsSync(builtClient)) {
  app.use(express.static(builtClient));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/")) return next();
    return res.sendFile(path.join(builtClient, "index.html"));
  });
}

app.use((req, res) => res.status(404).json({ message: "Route not found." }));
app.use((error, _req, res, _next) => {
  console.error(error);
  if (error?.name === "MulterError") {
    return res.status(400).json({
      message: error.code === "LIMIT_FILE_SIZE" ? "The selected file is too large." : error.message,
    });
  }
  if (error?.name === "ValidationError") return res.status(400).json({ message: error.message });
  if (error?.code === 11000) return res.status(409).json({ message: "That record already exists." });
  return res.status(500).json({ message: "The server could not complete the request." });
});

await connectDatabase(process.env.MONGODB_URI);
const server = app.listen(port, () => {
  console.log(`GiG Matrix API listening on http://localhost:${port}`);
});

async function shutdown() {
  server.close();
  await disconnectDatabase();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
