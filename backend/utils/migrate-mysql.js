import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import mysql from "mysql2/promise";
import mongoose from "mongoose";
import { Application, Job, Message, Profile, User } from "../models/index.js";
import { normalizeSkills } from "./validation.js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
dotenv.config({ path: path.join(projectRoot, ".env") });

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} must be configured.`);
  return value;
}

async function tableRows(connection, table) {
  try {
    const [rows] = await connection.query(`SELECT * FROM \`${table}\``);
    return rows;
  } catch (error) {
    if (error.code === "ER_NO_SUCH_TABLE") return [];
    throw error;
  }
}

async function upsertByLegacyId(Model, legacyId, document) {
  return Model.findOneAndUpdate(
    { legacyId: Number(legacyId) },
    { $set: { ...document, legacyId: Number(legacyId) } },
    { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true },
  );
}

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST || "127.0.0.1",
    port: Number(process.env.MYSQL_PORT || 3306),
    user: required("MYSQL_USER"),
    password: process.env.MYSQL_PASSWORD || "",
    database: required("MYSQL_DATABASE"),
  });
  await mongoose.connect(required("MONGODB_URI"));
  try {
    await Promise.all(Object.values(mongoose.models).map((model) => model.init()));

    const legacyUsers = await tableRows(connection, "users");
    const userIds = new Map();
    for (const row of legacyUsers) {
      const oldId = row.id;
      const rawPassword = String(row.password || "");
      const password = /^\$2[aby]\$/.test(rawPassword)
        ? rawPassword
        : await bcrypt.hash(rawPassword, 12);
      const user = await upsertByLegacyId(User, oldId, {
        username: row.username || row.full_name || row.email,
        email: String(row.email).trim().toLowerCase(),
        password,
        role: row.role === "developer" ? "developer" : "freelancer",
        createdAt: row.created_at || new Date(),
        updatedAt: row.updated_at || row.created_at || new Date(),
      });
      userIds.set(Number(oldId), user._id);
    }

    const legacyJobs = await tableRows(connection, "jobs");
    const jobIds = new Map();
    for (const row of legacyJobs) {
      const ownerId = row.developer_id ?? row.client_id;
      const owner = userIds.get(Number(ownerId));
      if (!owner) {
        console.warn(`Skipping job ${row.id}: no imported owner for legacy user ${ownerId}.`);
        continue;
      }
      const job = await upsertByLegacyId(Job, row.id, {
        developer: owner,
        title: row.title,
        description: row.description,
        budget: Number(row.budget),
        requiredSkills: normalizeSkills(row.required_skills),
        status: ["open", "in_progress", "completed", "cancelled", "closed"].includes(row.status)
          ? row.status
          : "open",
        category: row.category || "web",
        createdAt: row.created_at || new Date(),
        updatedAt: row.updated_at || row.created_at || new Date(),
      });
      jobIds.set(Number(row.id), job._id);
    }

    const legacyProfiles = await tableRows(connection, "freelancer_profiles");
    for (const row of legacyProfiles) {
      const user = userIds.get(Number(row.user_id));
      if (!user) continue;
      await Profile.findOneAndUpdate(
        { user },
        {
          $set: {
            legacyId: Number(row.id),
            fullName: row.full_name || "",
            bio: row.bio || "",
            skills: normalizeSkills(row.skills),
            experience: row.experience || "",
            education: row.education || "",
            portfolioUrl: row.portfolio_url || "",
            linkedinUrl: row.linkedin_url || "",
            githubUrl: row.github_url || "",
            profilePicture: row.profile_picture
              ? `/uploads/profile_pictures/${row.profile_picture}`
              : "",
            createdAt: row.created_at || new Date(),
            updatedAt: row.updated_at || row.created_at || new Date(),
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true },
      );
    }

    const legacyApplications = await tableRows(connection, "job_applications");
    let skippedApplications = 0;
    for (const row of legacyApplications) {
      const job = jobIds.get(Number(row.job_id));
      const freelancer = userIds.get(Number(row.freelancer_id));
      if (!job || !freelancer) {
        skippedApplications += 1;
        continue;
      }
      await upsertByLegacyId(Application, row.id, {
        job,
        freelancer,
        fullName: row.full_name || "",
        email: row.email || "",
        phone: row.phone || "",
        resumePath: row.resume_path || "",
        coverLetter: row.cover_letter || "",
        status: ["pending", "accepted", "rejected"].includes(row.status) ? row.status : "pending",
        createdAt: row.created_at || new Date(),
        updatedAt: row.updated_at || row.created_at || new Date(),
      });
    }

    const legacyMessages = await tableRows(connection, "messages");
    for (const row of legacyMessages) {
      const sender = userIds.get(Number(row.sender_id));
      const receiver = userIds.get(Number(row.receiver_id));
      if (!sender || !receiver) continue;
      await upsertByLegacyId(Message, row.id, {
        sender,
        receiver,
        message: row.message,
        createdAt: row.created_at || new Date(),
        updatedAt: row.created_at || new Date(),
      });
    }

    console.log(JSON.stringify({
      imported: {
        users: userIds.size,
        jobs: jobIds.size,
        profiles: legacyProfiles.length,
        applications: legacyApplications.length - skippedApplications,
        messages: legacyMessages.length,
      },
      skippedApplications,
    }, null, 2));
  } finally {
    await connection.end();
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error("MySQL-to-MongoDB import failed:", error);
  process.exitCode = 1;
});
