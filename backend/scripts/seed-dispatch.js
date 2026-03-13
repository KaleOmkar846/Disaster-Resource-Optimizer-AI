/**
 * seed-dispatch.js
 *
 * Seeds test volunteers and needs for the Intelligent Volunteer Dispatch feature.
 * ADDITIVE — does not wipe existing data.
 *
 * Usage:
 *   npm run seed:dispatch
 *   node scripts/seed-dispatch.js
 *
 * What it creates:
 *   Volunteers (role: volunteer)
 *     A — Priya Sharma   PIN 1111  skills: Medical, First Aid     near Shivajinagar
 *     B — Arjun Mehta    PIN 2222  skills: Search & Rescue        near Koregaon Park
 *     C — Sneha Patil    PIN 3333  skills: Driving, Logistics     near Hadapsar
 *
 *   Needs (unverified, ready to be verified → auto-dispatched)
 *     1. Medical emergency     — coordinates near Volunteer A (should dispatch to A)
 *     2. Search & Rescue call  — coordinates near Volunteer B (should dispatch to B)
 *     3. Food supply request   — coordinates near Volunteer C (should dispatch to C)
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import User from "../models/UserModel.js";
import Need from "../models/NeedModel.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

// ── Volunteer definitions ────────────────────────────────────────
// Coordinates are around Pune, India (default test region)
const VOLUNTEERS = [
  {
    pin: "1111",
    name: "Priya Sharma",
    role: "volunteer",
    phone: "+919000000001",
    skills: ["Medical", "First Aid"],
    availabilityStatus: "available",
    location: { lat: 18.5308, lng: 73.8476, updatedAt: new Date() }, // Shivajinagar
  },
  {
    pin: "2222",
    name: "Arjun Mehta",
    role: "volunteer",
    phone: "+919000000002",
    skills: ["Search & Rescue"],
    availabilityStatus: "available",
    location: { lat: 18.5362, lng: 73.8939, updatedAt: new Date() }, // Koregaon Park
  },
  {
    pin: "3333",
    name: "Sneha Patil",
    role: "volunteer",
    phone: "+919000000003",
    skills: ["Driving", "Logistics"],
    availabilityStatus: "available",
    location: { lat: 18.5089, lng: 73.9260, updatedAt: new Date() }, // Hadapsar
  },
];

// ── Need definitions ─────────────────────────────────────────────
// Each need is placed close to the volunteer whose skills match
const NEEDS = [
  {
    fromNumber: "+919900000001",
    rawMessage: "Person injured, needs immediate medical attention",
    triageData: {
      needType: "Medical",
      urgency: "High",
      details: "Elderly person with head injury near Shivajinagar bus stand",
      location: "Shivajinagar, Pune",
    },
    // ~300m from Volunteer A (Priya – Medical/First Aid)
    coordinates: { lat: 18.5330, lng: 73.8490 },
    status: "Unverified",
    volunteerAssignmentStatus: "unassigned",
  },
  {
    fromNumber: "+919900000002",
    rawMessage: "Family trapped in flooded building, need rescue",
    triageData: {
      needType: "Rescue",
      urgency: "High",
      details: "Three people on second floor, water rising. Near Park Street",
      location: "Koregaon Park, Pune",
    },
    // ~400m from Volunteer B (Arjun – Search & Rescue)
    coordinates: { lat: 18.5325, lng: 73.8960 },
    status: "Unverified",
    volunteerAssignmentStatus: "unassigned",
  },
  {
    fromNumber: "+919900000003",
    rawMessage: "Relief camp running out of food supplies",
    triageData: {
      needType: "Food",
      urgency: "Medium",
      details: "Camp at Hadapsar ground, ~200 people, stocks for 1 day remaining",
      location: "Hadapsar, Pune",
    },
    // ~500m from Volunteer C (Sneha – Driving/Logistics)
    coordinates: { lat: 18.5060, lng: 73.9290 },
    status: "Unverified",
    volunteerAssignmentStatus: "unassigned",
  },
];

// ── Helpers ──────────────────────────────────────────────────────
function hr() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

async function seedVolunteers(managerId) {
  const results = [];

  for (const data of VOLUNTEERS) {
    const existing = await User.findOne({ phone: data.phone });
    if (existing) {
      console.log(`  ~ Skipped  ${data.name.padEnd(16)} (already exists, PIN: ${data.pin})`);
      results.push(existing);
      continue;
    }

    const user = await User.create({ ...data, registeredBy: managerId });
    console.log(`  + Created  ${user.name.padEnd(16)} PIN: ${data.pin.padEnd(6)} skills: [${user.skills.join(", ")}]`);
    results.push(user);
  }

  return results;
}

async function seedNeeds() {
  const results = [];

  for (const data of NEEDS) {
    const existing = await Need.findOne({ fromNumber: data.fromNumber, "triageData.needType": data.triageData.needType });
    if (existing) {
      console.log(`  ~ Skipped  ${data.triageData.needType.padEnd(10)} need (already exists)`);
      results.push(existing);
      continue;
    }

    const need = await Need.create(data);
    console.log(
      `  + Created  ${need.triageData.needType.padEnd(10)} need  urgency: ${need.triageData.urgency.padEnd(7)} id: ${need._id}`,
    );
    results.push(need);
  }

  return results;
}

// ── Main ─────────────────────────────────────────────────────────
async function run() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error("Missing MONGO_URI in .env");
    process.exit(1);
  }

  console.log();
  hr();
  console.log("  DISPATCH FEATURE — TEST DATA SEEDER");
  hr();
  console.log(`  Connecting to: ${mongoUri}\n`);

  await mongoose.connect(mongoUri);
  console.log("  MongoDB connected\n");

  // Find any manager to use as registeredBy
  const manager = await User.findOne({ role: "manager", isActive: true });
  if (!manager) {
    console.error("  No manager found. Run `npm run db:clear` first to create the default manager.");
    await mongoose.disconnect();
    process.exit(1);
  }
  console.log(`  Using manager: ${manager.name} (${manager._id})\n`);

  // Seed volunteers
  hr();
  console.log("  VOLUNTEERS");
  hr();
  const volunteers = await seedVolunteers(manager._id);
  console.log(`\n  ${volunteers.length} volunteers processed\n`);

  // Seed needs
  hr();
  console.log("  NEEDS (unverified — ready to dispatch)");
  hr();
  const needs = await seedNeeds();
  console.log(`\n  ${needs.length} needs processed\n`);

  // Print usage summary
  hr();
  console.log("  READY TO TEST\n");
  console.log("  Login credentials:");
  VOLUNTEERS.forEach((v) => {
    console.log(`    PIN ${v.pin}  →  ${v.name.padEnd(16)} [${v.skills.join(", ")}]`);
  });
  console.log();
  console.log("  Next steps:");
  console.log("    1. Login as any volunteer → Volunteer page → Assignments tab");
  console.log("       (blank until dispatch runs)");
  console.log();
  console.log("    2. Login as the DEFAULT VOLUNTEER (PIN 9204) or any account");
  console.log("       → Tasks tab → verify one of the 3 seeded needs");
  console.log("       → dispatch auto-runs and assigns the best-matched volunteer");
  console.log();
  console.log("    3. Login as the matched volunteer");
  console.log("       → Assignments tab → card should appear");
  console.log("       → Expand → Accept / Navigate / Complete");
  console.log();
  console.log("  Expected auto-dispatch matches:");
  console.log("    Medical need    →  Priya Sharma   (Medical/First Aid, ~300m away)");
  console.log("    Rescue need     →  Arjun Mehta    (Search & Rescue, ~400m away)");
  console.log("    Food need       →  Sneha Patil    (Driving/Logistics, ~500m away)");
  hr();
  console.log();

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Seed failed:", err);
  process.exitCode = 1;
  mongoose.disconnect();
});
