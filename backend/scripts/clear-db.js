import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import User from "../models/UserModel.js";

// Load environment variables from backend/.env
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

const CONFIRM_FLAG = "--confirm";
const shouldProceed =
  process.argv.includes(CONFIRM_FLAG) ||
  process.env.DB_CLEAR_CONFIRM === "true";

async function clearDatabase() {
  if (!shouldProceed) {
    console.error(
      `Database wipe aborted. Pass ${CONFIRM_FLAG} or set DB_CLEAR_CONFIRM=true to proceed.`,
    );
    process.exit(1);
  }

  // Use the same MONGO_URI as the server
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    console.error("Missing MONGO_URI. Cannot connect to database.");
    process.exit(1);
  }

  try {
    console.log(`Connecting to: ${mongoUri}`);
    await mongoose.connect(mongoUri);
    console.log("MongoDB Connected successfully\n");

    const db = mongoose.connection.db;
    const collections = await db.collections();

    if (collections.length === 0) {
      console.log("No collections found. Nothing to clear.");
    } else {
      // First, show what data exists
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("📊 CURRENT DATABASE STATE");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

      let totalDocuments = 0;
      const collectionStats = [];

      for (const collection of collections) {
        const count = await collection.countDocuments();
        totalDocuments += count;
        if (count > 0) {
          collectionStats.push({ name: collection.collectionName, count });
        }
      }

      if (totalDocuments === 0) {
        console.log("✓ Database is already empty\n");
      } else {
        collectionStats.forEach(({ name, count }) => {
          console.log(
            `  ${name.padEnd(25)} : ${count.toLocaleString()} document(s)`,
          );
        });
        console.log(
          `\n  ${"TOTAL".padEnd(
            25,
          )} : ${totalDocuments.toLocaleString()} documents across ${
            collectionStats.length
          } collections\n`,
        );

        // Now clear the database
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("🗑️  CLEARING DATABASE");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

        for (const { name, count } of collectionStats) {
          const collection = db.collection(name);
          await collection.deleteMany({});
          console.log(
            `  ✓ Cleared ${count.toLocaleString()} document(s) from '${name}'`,
          );
        }

        console.log(
          `\n✅ Successfully removed ${totalDocuments.toLocaleString()} total documents!\n`,
        );
      }
    }

    // Create default users
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("� CREATING DEFAULT USERS");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const defaultManager = await User.create({
      pin: "0000",
      name: "Default Manager",
      role: "manager",
      email: "manager@disaster-response.local",
      phone: "+910000000000",
      skills: [],
      isActive: true,
    });
    console.log(`  ✅ Manager Account Created`);
    console.log(`     Name   : ${defaultManager.name}`);
    console.log(`     PIN    : 0000`);
    console.log(`     Role   : ${defaultManager.role}`);
    console.log(`     Email  : ${defaultManager.email}`);
    console.log(`     Phone  : ${defaultManager.phone}`);
    console.log(`     ID     : ${defaultManager._id}\n`);

    const defaultVolunteer = await User.create({
      pin: "9204",
      name: "Default Volunteer",
      role: "volunteer",
      email: "volunteer@disaster-response.local",
      phone: "+910000000001",
      skills: [],
      availabilityStatus: "available",
      activeTaskCount: 0,
      completedTaskCount: 0,
      isActive: true,
    });
    console.log(`  ✅ Volunteer Account Created`);
    console.log(`     Name               : ${defaultVolunteer.name}`);
    console.log(`     PIN                : 9204`);
    console.log(`     Role               : ${defaultVolunteer.role}`);
    console.log(`     Email              : ${defaultVolunteer.email}`);
    console.log(`     Phone              : ${defaultVolunteer.phone}`);
    console.log(`     Skills             : (none)`);
    console.log(
      `     Availability       : ${defaultVolunteer.availabilityStatus}`,
    );
    console.log(
      `     Active Tasks       : ${defaultVolunteer.activeTaskCount}`,
    );
    console.log(
      `     Completed Tasks    : ${defaultVolunteer.completedTaskCount}`,
    );
    console.log(`     Location           : (not set)`);
    console.log(`     ID                 : ${defaultVolunteer._id}\n`);

    // Create dispatch test volunteers
    const dispatchVolunteers = [
      {
        pin: "1111",
        name: "Priya Sharma",
        role: "volunteer",
        email: "priya@disaster-response.local",
        phone: "+919000000001",
        skills: ["Medical", "First Aid"],
        availabilityStatus: "available",
        activeTaskCount: 0,
        completedTaskCount: 0,
        location: { lat: 18.5308, lng: 73.8476, updatedAt: new Date() },
        registeredBy: defaultManager._id,
        isActive: true,
      },
      {
        pin: "2222",
        name: "Arjun Mehta",
        role: "volunteer",
        email: "arjun@disaster-response.local",
        phone: "+919000000002",
        skills: ["Search & Rescue"],
        availabilityStatus: "available",
        activeTaskCount: 0,
        completedTaskCount: 0,
        location: { lat: 18.5362, lng: 73.8939, updatedAt: new Date() },
        registeredBy: defaultManager._id,
        isActive: true,
      },
      {
        pin: "3333",
        name: "Sneha Patil",
        role: "volunteer",
        email: "sneha@disaster-response.local",
        phone: "+919000000003",
        skills: ["Driving", "Logistics"],
        availabilityStatus: "available",
        activeTaskCount: 0,
        completedTaskCount: 0,
        location: { lat: 18.5089, lng: 73.926, updatedAt: new Date() },
        registeredBy: defaultManager._id,
        isActive: true,
      },
    ];

    for (const data of dispatchVolunteers) {
      const v = await User.create(data);
      console.log(`  ✅ Dispatch Volunteer Created`);
      console.log(`     Name               : ${v.name}`);
      console.log(`     PIN                : ${data.pin}`);
      console.log(`     Role               : ${v.role}`);
      console.log(`     Email              : ${v.email}`);
      console.log(`     Phone              : ${v.phone}`);
      console.log(`     Skills             : ${v.skills.join(", ")}`);
      console.log(`     Availability       : ${v.availabilityStatus}`);
      console.log(`     Active Tasks       : ${v.activeTaskCount}`);
      console.log(`     Completed Tasks    : ${v.completedTaskCount}`);
      console.log(
        `     Location (lat/lng) : ${v.location.lat}, ${v.location.lng}`,
      );
      console.log(`     Registered By      : ${defaultManager.name}`);
      console.log(`     ID                 : ${v._id}\n`);
    }

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✨ DATABASE RESET COMPLETE");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    console.log("  Summary:");
    console.log(
      "  • All collections cleared (reports, missions, stations, alerts, needs, etc.)",
    );
    console.log("  • 5 users created:");
    console.log("      PIN 0000  →  Default Manager");
    console.log("      PIN 9204  →  Default Volunteer");
    console.log("      PIN 1111  →  Priya Sharma   [Medical, First Aid]");
    console.log("      PIN 2222  →  Arjun Mehta    [Search & Rescue]");
    console.log("      PIN 3333  →  Sneha Patil    [Driving, Logistics]");
    console.log("  • System ready for fresh data\n");
  } catch (error) {
    console.error("Failed to clear database:", error);
    process.exitCode = 1;
  }

  try {
    await mongoose.disconnect();
  } catch (disconnectError) {
    console.error(
      "Failed to close MongoDB connection cleanly:",
      disconnectError,
    );
  }
}

clearDatabase();
