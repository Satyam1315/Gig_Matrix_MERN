import test from "node:test";
import assert from "node:assert/strict";
import { normalizeSkills, validateJob, validateRegistration } from "../utils/validation.js";

test("registration validation accepts both marketplace roles", () => {
  for (const role of ["developer", "freelancer"]) {
    assert.equal(validateRegistration({
      username: "Avery Smith",
      email: "avery@example.com",
      password: "secret1",
      role,
    }), null);
  }
});

test("registration validation rejects short passwords and unsupported roles", () => {
  assert.match(validateRegistration({
    username: "Avery Smith",
    email: "avery@example.com",
    password: "short",
    role: "freelancer",
  }), /6 characters/);
  assert.match(validateRegistration({
    username: "Avery Smith",
    email: "avery@example.com",
    password: "secret1",
    role: "admin",
  }), /valid account role/);
});

test("job validation rejects missing details and non-positive budgets", () => {
  assert.match(validateJob({ title: "", description: "Details", budget: 10 }), /title/);
  assert.match(validateJob({ title: "Design", description: "", budget: 10 }), /description/);
  assert.match(validateJob({ title: "Design", description: "Details", budget: 0 }), /greater than zero/);
  assert.equal(validateJob({ title: "Design", description: "Details", budget: "100" }), null);
});

test("skills are normalized from legacy CSV and form arrays", () => {
  assert.deepEqual(normalizeSkills(" React, CSS, , Node.js "), ["React", "CSS", "Node.js"]);
  assert.deepEqual(normalizeSkills([" React ", "", "Node.js"]), ["React", "Node.js"]);
  assert.deepEqual(normalizeSkills(null), []);
});
