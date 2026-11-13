export function normalizeSkills(value) {
  if (Array.isArray(value)) {
    return value.map((skill) => String(skill).trim()).filter(Boolean);
  }
  if (typeof value !== "string") return [];
  return value.split(",").map((skill) => skill.trim()).filter(Boolean);
}

export function validateRegistration({ username, email, password, role }) {
  if (typeof username !== "string" || username.trim().length < 2) {
    return "Enter your full name.";
  }
  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return "Enter a valid email address.";
  }
  if (typeof password !== "string" || password.length < 6) {
    return "Password must be at least 6 characters.";
  }
  if (!["developer", "freelancer"].includes(role)) {
    return "Choose a valid account role.";
  }
  return null;
}

export function validateJob({ title, description, budget }) {
  if (typeof title !== "string" || !title.trim()) return "Job title is required.";
  if (typeof description !== "string" || !description.trim()) {
    return "Job description is required.";
  }
  if (!Number.isFinite(Number(budget)) || Number(budget) <= 0) {
    return "Budget must be greater than zero.";
  }
  return null;
}
