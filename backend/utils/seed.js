import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { Application, Job, Message, Profile, User } from "../models/index.js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
dotenv.config({ path: path.join(projectRoot, ".env") });

const demoPassword = "GigMatrixDemo2026!";

async function upsertUser({ email, username, role, passwordHash }) {
  return User.findOneAndUpdate(
    { email },
    {
      $set: { username, role, password: passwordHash },
      $setOnInsert: { email },
    },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  );
}

async function upsertJob(developer, data) {
  return Job.findOneAndUpdate(
    { developer, title: data.title },
    { $set: data, $setOnInsert: { developer } },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  );
}

async function upsertApplication(job, freelancer, data) {
  return Application.findOneAndUpdate(
    { job, freelancer },
    { $set: data, $setOnInsert: { job, freelancer } },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  );
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed a production database.");
  }
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI must be set in the project root .env file.");
  }

  await mongoose.connect(process.env.MONGODB_URI);
  try {
    await Promise.all(Object.values(mongoose.models).map((model) => model.init()));

    const passwordHash = await bcrypt.hash(demoPassword, 12);
    const [developer, freelancer, designer] = await Promise.all([
      upsertUser({
        email: "demo.developer@gigmatrix.test",
        username: "Demo Project Owner",
        role: "developer",
        passwordHash,
      }),
      upsertUser({
        email: "demo.freelancer@gigmatrix.test",
        username: "Demo Freelancer",
        role: "freelancer",
        passwordHash,
      }),
      upsertUser({
        email: "demo.designer@gigmatrix.test",
        username: "Demo Designer",
        role: "freelancer",
        passwordHash,
      }),
    ]);

    await Promise.all([
      Profile.findOneAndUpdate(
        { user: developer._id },
        { $set: { fullName: developer.username, bio: "A sample project owner account for testing GiG Matrix." } },
        { upsert: true, new: true, runValidators: true },
      ),
      Profile.findOneAndUpdate(
        { user: freelancer._id },
        {
          $set: {
            fullName: freelancer.username,
            bio: "Full-stack developer who enjoys building accessible, reliable web applications.",
            skills: ["React", "Node.js", "MongoDB", "Accessibility"],
            experience: "Five years of experience building modern web products.",
            education: "BSc in Computer Science",
            portfolioUrl: "https://example.com",
            githubUrl: "https://github.com",
          },
        },
        { upsert: true, new: true, runValidators: true },
      ),
      Profile.findOneAndUpdate(
        { user: designer._id },
        {
          $set: {
            fullName: designer.username,
            bio: "Product designer focused on clear, thoughtful user experiences.",
            skills: ["Figma", "UI Design", "Prototyping", "Design Systems"],
            experience: "Four years designing web and mobile applications.",
            portfolioUrl: "https://example.org",
          },
        },
        { upsert: true, new: true, runValidators: true },
      ),
    ]);

    const jobData = [
      {
        title: "Sample: React Dashboard Developer",
        description: "Build a responsive analytics dashboard for a growing product team. The project includes reusable React components, accessible charts, and a polished mobile layout.",
        budget: 1800,
        category: "web",
        requiredSkills: ["React", "JavaScript", "CSS", "Accessibility"],
        experienceLevel: "intermediate",
        jobType: "contract",
        status: "open",
      },
      {
        title: "Sample: Brand Identity Designer",
        description: "Create a clear visual identity for a small independent business, including a logo direction, color palette, and a concise handoff guide.",
        budget: 950,
        category: "design",
        requiredSkills: ["Branding", "Figma", "Illustration"],
        experienceLevel: "intermediate",
        jobType: "part-time",
        status: "open",
      },
      {
        title: "Sample: Node.js API Improvements",
        description: "Improve an existing Node.js API with clear validation, useful error responses, and maintainable documentation.",
        budget: 1250,
        category: "web",
        requiredSkills: ["Node.js", "Express", "MongoDB"],
        experienceLevel: "expert",
        jobType: "contract",
        status: "open",
      },
    ];
    const jobs = await Promise.all(jobData.map((job) => upsertJob(developer._id, job)));

    const applications = await Promise.all([
      upsertApplication(jobs[0]._id, freelancer._id, {
        fullName: freelancer.username,
        email: freelancer.email,
        phone: "",
        resumePath: "",
        coverLetter: "I have built several responsive React dashboards and would be glad to help with this project.",
        status: "pending",
      }),
      upsertApplication(jobs[1]._id, designer._id, {
        fullName: designer.username,
        email: designer.email,
        phone: "",
        resumePath: "",
        coverLetter: "I am a product designer with experience creating brand identities and design systems.",
        status: "accepted",
      }),
    ]);

    await Promise.all([
      Message.findOneAndUpdate(
        { sender: developer._id, receiver: freelancer._id, message: "Hi! Thanks for applying. Could you share a little about your dashboard experience?" },
        { $setOnInsert: { sender: developer._id, receiver: freelancer._id, message: "Hi! Thanks for applying. Could you share a little about your dashboard experience?" } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      ),
      Message.findOneAndUpdate(
        { sender: freelancer._id, receiver: developer._id, message: "Absolutely! I have worked on analytics dashboards with responsive layouts and accessible chart components." },
        { $setOnInsert: { sender: freelancer._id, receiver: developer._id, message: "Absolutely! I have worked on analytics dashboards with responsive layouts and accessible chart components." } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      ),
    ]);

    console.log("Sample data is ready.");
    console.log(`Login password for all demo accounts: ${demoPassword}`);
    console.log("Accounts:");
    console.log("  Project owner: demo.developer@gigmatrix.test");
    console.log("  Freelancer:    demo.freelancer@gigmatrix.test");
    console.log("  Designer:      demo.designer@gigmatrix.test");
    console.log(`Created/updated ${jobs.length} sample jobs and ${applications.length} sample applications.`);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error("Could not seed sample data:", error);
  process.exitCode = 1;
});
