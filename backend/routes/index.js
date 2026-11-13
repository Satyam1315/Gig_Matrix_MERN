import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import express from "express";
import multer from "multer";
import nodemailer from "nodemailer";
import mongoose from "mongoose";
import { Application, Job, Message, Profile, User } from "../models/index.js";
import { clearSession, issueSession, requireAuth, requireRole } from "../middleware/auth.js";
import { normalizeSkills, validateJob, validateRegistration } from "../utils/validation.js";

const router = express.Router();
const asyncRoute = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const uploadRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "uploads");

for (const folder of ["profile_pictures", "resumes"]) {
  fs.mkdirSync(path.join(uploadRoot, folder), { recursive: true });
}

function createUploader(folder, maxSize) {
  return multer({
    storage: multer.diskStorage({
      destination: (_req, _file, callback) => callback(null, path.join(uploadRoot, folder)),
      filename: (_req, file, callback) => {
        const extension = path.extname(file.originalname).toLowerCase();
        callback(null, `${crypto.randomUUID()}${extension}`);
      },
    }),
    limits: { fileSize: maxSize },
    fileFilter: (_req, file, callback) => {
      const allowed = folder === "profile_pictures"
        ? ["image/jpeg", "image/png", "image/gif", "image/webp"]
        : ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
      if (!allowed.includes(file.mimetype)) {
        return callback(new Error(folder === "profile_pictures"
          ? "Profile pictures must be JPG, PNG, GIF, or WEBP."
          : "Resumes must be PDF, DOC, or DOCX files."));
      }
      return callback(null, true);
    },
  });
}

const profilePictureUpload = createUploader("profile_pictures", 2 * 1024 * 1024).single("profilePicture");
const resumeUpload = createUploader("resumes", 5 * 1024 * 1024).single("resume");

function publicUser(user) {
  return { _id: user._id, username: user.username, email: user.email, role: user.role };
}

function isValidId(id) {
  return mongoose.isValidObjectId(id);
}

function smtpTransport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !process.env.SMTP_FROM) {
    return null;
  }
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

function otpDigest(value) {
  return crypto.createHmac("sha256", process.env.JWT_SECRET).update(value).digest("hex");
}

router.get("/health", (_req, res) => {
  res.json({ status: "ok", database: mongoose.connection.readyState === 1 ? "connected" : "disconnected" });
});

router.post("/auth/signup", asyncRoute(async (req, res) => {
  const validationError = validateRegistration(req.body);
  if (validationError) return res.status(400).json({ message: validationError });

  const email = req.body.email.trim().toLowerCase();
  if (await User.exists({ email })) return res.status(409).json({ message: "Email already exists. Please sign in or use another address." });

  const user = await User.create({
    username: req.body.username.trim(),
    email,
    password: await bcrypt.hash(req.body.password, 12),
    role: req.body.role,
  });
  await Profile.create({ user: user._id, fullName: user.username });
  issueSession(res, user);
  return res.status(201).json({ user: publicUser(user) });
}));

router.post("/auth/login", asyncRoute(async (req, res) => {
  const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = typeof req.body.password === "string" ? req.body.password : "";
  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await bcrypt.compare(password, user.password.replace(/^\$2y\$/, "$2b$")))) {
    return res.status(401).json({ message: "Invalid email or password." });
  }
  issueSession(res, user);
  return res.json({ user: publicUser(user) });
}));

router.post("/auth/logout", (_req, res) => {
  clearSession(res);
  res.json({ message: "Signed out." });
});

router.get("/auth/me", requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

router.post("/auth/forgot-password", asyncRoute(async (req, res) => {
  const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const user = await User.findOne({ email });
  if (!user) return res.json({ message: "If that email belongs to an account, a reset code will be sent." });

  const mailer = smtpTransport();
  if (!mailer) {
    return res.status(503).json({ message: "Password-reset email is not configured. Set the SMTP variables and try again." });
  }
  const otp = crypto.randomInt(100000, 1000000).toString();
  user.resetOtpHash = otpDigest(otp);
  user.resetOtpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
  await user.save();
  await mailer.sendMail({
    from: process.env.SMTP_FROM,
    to: user.email,
    subject: "Password reset request - GiG Matrix",
    text: `Your GiG Matrix password reset code is ${otp}. It expires in 5 minutes.`,
  });
  return res.json({ message: "If that email belongs to an account, a reset code will be sent." });
}));

router.post("/auth/reset-password", asyncRoute(async (req, res) => {
  const { email, otp, password, confirmPassword } = req.body;
  if (typeof email !== "string" || typeof otp !== "string" || !/^\d{6}$/.test(otp)) {
    return res.status(400).json({ message: "Enter the email address and 6-digit reset code." });
  }
  if (typeof password !== "string" || password.length < 6 || password !== confirmPassword) {
    return res.status(400).json({ message: "Passwords must match and be at least 6 characters." });
  }
  const user = await User.findOne({ email: email.trim().toLowerCase() })
    .select("+resetOtpHash +resetOtpExpiresAt");
  const received = otpDigest(otp);
  const expected = user?.resetOtpHash;
  const matches = expected
    && crypto.timingSafeEqual(Buffer.from(received, "hex"), Buffer.from(expected, "hex"));
  if (!user || !matches || !user.resetOtpExpiresAt || user.resetOtpExpiresAt.getTime() < Date.now()) {
    return res.status(400).json({ message: "The reset code is invalid or expired. Request a new code." });
  }
  user.password = await bcrypt.hash(password, 12);
  user.resetOtpHash = undefined;
  user.resetOtpExpiresAt = undefined;
  await user.save();
  return res.json({ message: "Password updated. You can now sign in." });
}));

router.get("/jobs", asyncRoute(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  else filter.status = "open";
  if (req.query.category) filter.category = req.query.category;
  if (req.query.search) {
    const search = String(req.query.search).trim().slice(0, 100);
    filter.$or = [
      { title: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
      { requiredSkills: { $regex: search, $options: "i" } },
    ];
  }
  const jobs = await Job.find(filter).populate("developer", "username").sort({ createdAt: -1 }).limit(100);
  return res.json({ jobs });
}));

router.post("/jobs", requireAuth, requireRole("developer"), asyncRoute(async (req, res) => {
  const validationError = validateJob(req.body);
  if (validationError) return res.status(400).json({ message: validationError });
  const job = await Job.create({
    developer: req.user._id,
    title: req.body.title.trim(),
    description: req.body.description.trim(),
    budget: Number(req.body.budget),
    category: typeof req.body.category === "string" && req.body.category.trim() ? req.body.category.trim() : "web",
    requiredSkills: normalizeSkills(req.body.requiredSkills),
    experienceLevel: req.body.experienceLevel || "",
    jobType: req.body.jobType || "",
  });
  return res.status(201).json({ job });
}));

router.get("/jobs/mine", requireAuth, requireRole("developer"), asyncRoute(async (req, res) => {
  const jobs = await Job.find({ developer: req.user._id }).sort({ createdAt: -1 });
  const counts = await Application.aggregate([
    { $match: { job: { $in: jobs.map((job) => job._id) } } },
    { $group: { _id: "$job", count: { $sum: 1 } } },
  ]);
  const countByJob = new Map(counts.map((entry) => [String(entry._id), entry.count]));
  return res.json({ jobs: jobs.map((job) => ({ ...job.toObject(), applicationCount: countByJob.get(String(job._id)) || 0 })) });
}));

router.get("/jobs/:id", asyncRoute(async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ message: "Invalid job id." });
  const job = await Job.findById(req.params.id).populate("developer", "username email");
  if (!job) return res.status(404).json({ message: "Job not found." });
  return res.json({ job });
}));

router.patch("/jobs/:id", requireAuth, requireRole("developer"), asyncRoute(async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ message: "Invalid job id." });
  const job = await Job.findOne({ _id: req.params.id, developer: req.user._id });
  if (!job) return res.status(404).json({ message: "Job not found." });
  const validationError = validateJob({
    title: req.body.title ?? job.title,
    description: req.body.description ?? job.description,
    budget: req.body.budget ?? job.budget,
  });
  if (validationError) return res.status(400).json({ message: validationError });
  for (const field of ["title", "description", "budget", "status", "category", "experienceLevel", "jobType"]) {
    if (req.body[field] !== undefined) job[field] = field === "budget" ? Number(req.body[field]) : req.body[field];
  }
  if (req.body.requiredSkills !== undefined) job.requiredSkills = normalizeSkills(req.body.requiredSkills);
  if (!["open", "in_progress", "completed", "cancelled", "closed"].includes(job.status)) {
    return res.status(400).json({ message: "Invalid job status." });
  }
  await job.save();
  return res.json({ job });
}));

router.delete("/jobs/:id", requireAuth, requireRole("developer"), asyncRoute(async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ message: "Invalid job id." });
  const job = await Job.findOneAndDelete({ _id: req.params.id, developer: req.user._id });
  if (!job) return res.status(404).json({ message: "Job not found." });
  await Application.deleteMany({ job: job._id });
  return res.json({ message: "Job deleted." });
}));

router.post("/jobs/:id/applications", requireAuth, requireRole("freelancer"), (req, res, next) => {
  resumeUpload(req, res, (error) => {
    if (error) return next(error);
    return next();
  });
}, asyncRoute(async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ message: "Invalid job id." });
  const job = await Job.findById(req.params.id);
  if (!job || job.status !== "open") return res.status(404).json({ message: "This job is no longer available." });
  try {
    const application = await Application.create({
      job: job._id,
      freelancer: req.user._id,
      fullName: req.body.fullName?.trim() || req.user.username,
      email: req.user.email,
      phone: req.body.phone?.trim() || "",
      resumePath: req.file ? `/uploads/resumes/${req.file.filename}` : "",
      coverLetter: req.body.coverLetter?.trim() || "I am interested in this position and believe my skills match the requirements.",
    });
    return res.status(201).json({ application, message: "Application submitted successfully." });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ message: "You have already applied for this job." });
    throw error;
  }
}));

router.get("/applications/mine", requireAuth, requireRole("freelancer"), asyncRoute(async (req, res) => {
  const applications = await Application.find({ freelancer: req.user._id })
    .populate({ path: "job", populate: { path: "developer", select: "username" } })
    .sort({ createdAt: -1 });
  return res.json({ applications });
}));

router.get("/applications/received", requireAuth, requireRole("developer"), asyncRoute(async (req, res) => {
  const jobs = await Job.find({ developer: req.user._id }).select("_id");
  const applications = await Application.find({ job: { $in: jobs.map((job) => job._id) } })
    .populate("job")
    .populate("freelancer", "username email")
    .sort({ createdAt: -1 });
  return res.json({ applications });
}));

router.patch("/applications/:id", requireAuth, requireRole("developer"), asyncRoute(async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ message: "Invalid application id." });
  if (!["pending", "accepted", "rejected"].includes(req.body.status)) {
    return res.status(400).json({ message: "Choose a valid application status." });
  }
  const jobs = await Job.find({ developer: req.user._id }).select("_id");
  const application = await Application.findOne({
    _id: req.params.id,
    job: { $in: jobs.map((job) => job._id) },
  });
  if (!application) return res.status(404).json({ message: "Application not found." });
  application.status = req.body.status;
  await application.save();
  return res.json({ application });
}));

router.get("/profile", requireAuth, asyncRoute(async (req, res) => {
  const profile = await Profile.findOneAndUpdate(
    { user: req.user._id },
    { $setOnInsert: { fullName: req.user.username } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
  return res.json({ profile });
}));

router.patch("/profile", requireAuth, asyncRoute(async (req, res) => {
  const fields = ["fullName", "bio", "experience", "education", "portfolioUrl", "linkedinUrl", "githubUrl"];
  const update = {};
  for (const field of fields) {
    if (req.body[field] !== undefined) update[field] = String(req.body[field]).trim();
  }
  if (req.body.skills !== undefined) update.skills = normalizeSkills(req.body.skills);
  for (const field of ["portfolioUrl", "linkedinUrl", "githubUrl"]) {
    if (update[field] && !/^https?:\/\//i.test(update[field])) {
      return res.status(400).json({ message: `${field} must be an http or https URL.` });
    }
  }
  const profile = await Profile.findOneAndUpdate(
    { user: req.user._id },
    { $set: update, $setOnInsert: { fullName: req.user.username } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  );
  return res.json({ profile });
}));

router.post("/profile/picture", requireAuth, (req, res, next) => {
  profilePictureUpload(req, res, (error) => {
    if (error) return next(error);
    return next();
  });
}, asyncRoute(async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "Choose a profile picture to upload." });
  const profile = await Profile.findOneAndUpdate(
    { user: req.user._id },
    { $set: { profilePicture: `/uploads/profile_pictures/${req.file.filename}` } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
  return res.json({ profile });
}));

router.delete("/profile/picture", requireAuth, asyncRoute(async (req, res) => {
  const profile = await Profile.findOne({ user: req.user._id });
  if (!profile) return res.status(404).json({ message: "Profile not found." });
  if (profile.profilePicture.startsWith("/uploads/profile_pictures/")) {
    const localPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", profile.profilePicture.replace(/^\/uploads\//, "uploads/"));
    if (localPath.startsWith(path.join(uploadRoot, "profile_pictures"))) {
      await fs.promises.rm(localPath, { force: true });
    }
  }
  profile.profilePicture = "";
  await profile.save();
  return res.json({ profile });
}));

router.get("/messages/conversations", requireAuth, asyncRoute(async (req, res) => {
  const latest = await Message.aggregate([
    { $match: { $or: [{ sender: req.user._id }, { receiver: req.user._id }] } },
    { $addFields: { otherUser: { $cond: [{ $eq: ["$sender", req.user._id] }, "$receiver", "$sender"] } } },
    { $sort: { createdAt: -1 } },
    { $group: { _id: "$otherUser", message: { $first: "$message" }, createdAt: { $first: "$createdAt" } } },
  ]);
  const ids = latest.map((conversation) => conversation._id);
  const users = await User.find({ _id: { $in: ids } }).select("username role");
  const byId = new Map(users.map((user) => [String(user._id), user]));
  return res.json({
    conversations: latest.map((conversation) => ({
      user: byId.get(String(conversation._id)),
      message: conversation.message,
      createdAt: conversation.createdAt,
    })).filter((conversation) => conversation.user),
  });
}));

router.get("/messages/:userId", requireAuth, asyncRoute(async (req, res) => {
  if (!isValidId(req.params.userId)) return res.status(400).json({ message: "Invalid user id." });
  const otherUser = await User.findById(req.params.userId).select("username role");
  if (!otherUser) return res.status(404).json({ message: "User not found." });
  const messages = await Message.find({
    $or: [
      { sender: req.user._id, receiver: otherUser._id },
      { sender: otherUser._id, receiver: req.user._id },
    ],
  }).sort({ createdAt: 1 }).limit(500);
  return res.json({ user: otherUser, messages });
}));

router.post("/messages/:userId", requireAuth, asyncRoute(async (req, res) => {
  if (!isValidId(req.params.userId)) return res.status(400).json({ message: "Invalid user id." });
  const message = typeof req.body.message === "string" ? req.body.message.trim() : "";
  if (!message || message.length > 5000) return res.status(400).json({ message: "Message must be between 1 and 5000 characters." });
  if (String(req.user._id) === req.params.userId) return res.status(400).json({ message: "You cannot message yourself." });
  if (!(await User.exists({ _id: req.params.userId }))) return res.status(404).json({ message: "User not found." });
  const created = await Message.create({ sender: req.user._id, receiver: req.params.userId, message });
  return res.status(201).json({ message: created });
}));

export default router;
