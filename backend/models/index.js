import mongoose from "mongoose";

const { Schema } = mongoose;

const userSchema = new Schema(
  {
    legacyId: { type: Number, unique: true, sparse: true },
    username: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["developer", "freelancer"], required: true },
    resetOtpHash: String,
    resetOtpExpiresAt: Date,
  },
  { timestamps: true },
);

const jobSchema = new Schema(
  {
    legacyId: { type: Number, unique: true, sparse: true },
    developer: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true, maxlength: 255 },
    description: { type: String, required: true, trim: true },
    budget: { type: Number, required: true, min: 0.01 },
    requiredSkills: { type: [String], default: [] },
    status: {
      type: String,
      enum: ["open", "in_progress", "completed", "cancelled", "closed"],
      default: "open",
    },
    category: { type: String, default: "web", trim: true },
    experienceLevel: { type: String, default: "" },
    jobType: { type: String, default: "" },
  },
  { timestamps: true },
);

const applicationSchema = new Schema(
  {
    legacyId: { type: Number, unique: true, sparse: true },
    job: { type: Schema.Types.ObjectId, ref: "Job", required: true },
    freelancer: { type: Schema.Types.ObjectId, ref: "User", required: true },
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, default: "" },
    resumePath: { type: String, default: "" },
    coverLetter: { type: String, default: "" },
    status: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending" },
  },
  { timestamps: true },
);
applicationSchema.index({ job: 1, freelancer: 1 }, { unique: true });

const profileSchema = new Schema(
  {
    legacyId: { type: Number, unique: true, sparse: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    fullName: { type: String, default: "" },
    bio: { type: String, default: "" },
    skills: { type: [String], default: [] },
    experience: { type: String, default: "" },
    education: { type: String, default: "" },
    portfolioUrl: { type: String, default: "" },
    linkedinUrl: { type: String, default: "" },
    githubUrl: { type: String, default: "" },
    profilePicture: { type: String, default: "" },
  },
  { timestamps: true },
);

const messageSchema = new Schema(
  {
    legacyId: { type: Number, unique: true, sparse: true },
    sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
    receiver: { type: Schema.Types.ObjectId, ref: "User", required: true },
    message: { type: String, required: true, trim: true, maxlength: 5000 },
  },
  { timestamps: true },
);
messageSchema.index({ sender: 1, receiver: 1, createdAt: 1 });

export const User = mongoose.model("User", userSchema);
export const Job = mongoose.model("Job", jobSchema);
export const Application = mongoose.model("Application", applicationSchema);
export const Profile = mongoose.model("Profile", profileSchema);
export const Message = mongoose.model("Message", messageSchema);
