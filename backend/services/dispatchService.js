import User from "../models/UserModel.js";
import Need from "../models/NeedModel.js";
import { logger } from "../utils/appLogger.js";

// ── Scoring Weights ──────────────────────────────────────────────
const WEIGHTS = {
  proximity: 0.4,
  skill: 0.3,
  workload: 0.2,
  fatigue: 0.1,
};

const MIN_SCORE_THRESHOLD = 0.2;
const MAX_ACTIVE_TASKS = 3;
const MAX_SHIFT_HOURS = 8;
const MAX_PROXIMITY_KM = 20;
const LOCATION_STALE_MS = 15 * 60 * 1000; // 15 minutes

// ── Skill-to-NeedType Mapping ────────────────────────────────────
// Maps each needType to the volunteer skills that qualify
const SKILL_NEED_MAP = {
  Medical: ["Medical", "First Aid"],
  Rescue: ["Search & Rescue", "First Aid"],
  Water: ["Logistics", "Driving"],
  Food: ["Cooking", "Logistics", "Driving"],
  Other: [], // any volunteer qualifies
};

// ── Haversine Distance (meters) ──────────────────────────────────
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// ── Scoring Functions ────────────────────────────────────────────

function scoreProximity(volunteer, taskLat, taskLng) {
  if (
    typeof volunteer.location?.lat !== "number" ||
    typeof volunteer.location?.lng !== "number"
  ) {
    return 0;
  }

  const distanceMeters = haversine(
    volunteer.location.lat,
    volunteer.location.lng,
    taskLat,
    taskLng,
  );
  const distanceKm = distanceMeters / 1000;
  let score = 1 - Math.min(distanceKm / MAX_PROXIMITY_KM, 1);

  // Penalize stale location data
  if (volunteer.location.updatedAt) {
    const staleness =
      Date.now() - new Date(volunteer.location.updatedAt).getTime();
    if (staleness > LOCATION_STALE_MS) {
      score *= 0.5;
    }
  } else {
    score *= 0.5;
  }

  return score;
}

function scoreSkillMatch(volunteer, needType) {
  const requiredSkills = SKILL_NEED_MAP[needType] || [];

  // If no specific skills required ("Other" or unknown), any volunteer is fine
  if (requiredSkills.length === 0) {
    return 0.5;
  }

  const volunteerSkills = volunteer.skills || [];
  const hasMatch = requiredSkills.some((skill) =>
    volunteerSkills.includes(skill),
  );

  return hasMatch ? 1.0 : 0;
}

function scoreWorkload(volunteer) {
  const active = volunteer.activeTaskCount || 0;
  return 1 - Math.min(active / MAX_ACTIVE_TASKS, 1);
}

function scoreFatigue(volunteer) {
  if (!volunteer.shiftStartedAt) {
    return 1.0; // No shift tracking = assume fresh
  }
  const hoursOnShift =
    (Date.now() - new Date(volunteer.shiftStartedAt).getTime()) /
    (1000 * 60 * 60);
  return 1 - Math.min(hoursOnShift / MAX_SHIFT_HOURS, 1);
}

/**
 * Calculate composite dispatch score for a volunteer-task pair.
 * Returns { total, breakdown } where breakdown shows individual factor scores.
 */
export function scoreVolunteer(volunteer, task) {
  const taskLat = task.coordinates?.lat;
  const taskLng = task.coordinates?.lng;
  const needType = task.triageData?.needType || "Other";

  const proximity =
    typeof taskLat === "number" && typeof taskLng === "number"
      ? scoreProximity(volunteer, taskLat, taskLng)
      : 0.5; // Neutral if task has no coordinates

  const skill = scoreSkillMatch(volunteer, needType);
  const workload = scoreWorkload(volunteer);
  const fatigue = scoreFatigue(volunteer);

  const total =
    WEIGHTS.proximity * proximity +
    WEIGHTS.skill * skill +
    WEIGHTS.workload * workload +
    WEIGHTS.fatigue * fatigue;

  return {
    total,
    breakdown: { proximity, skill, workload, fatigue },
  };
}

/**
 * Find and rank available volunteers for a given task.
 * Returns array of { volunteer, score, breakdown } sorted by score descending.
 */
export async function findBestVolunteers(task) {
  // Query: available, active, not at max tasks
  const candidates = await User.find({
    isActive: true,
    role: "volunteer",
    availabilityStatus: "available",
    activeTaskCount: { $lt: MAX_ACTIVE_TASKS },
  }).lean();

  if (candidates.length === 0) {
    logger.info("[Dispatch] No available volunteers found");
    return [];
  }

  const scored = candidates
    .map((volunteer) => {
      const { total, breakdown } = scoreVolunteer(volunteer, task);
      return { volunteer, score: total, breakdown };
    })
    .filter((entry) => entry.score >= MIN_SCORE_THRESHOLD)
    .sort((a, b) => b.score - a.score);

  logger.info(
    `[Dispatch] Scored ${candidates.length} candidates, ${scored.length} above threshold`,
  );

  return scored;
}

/**
 * Auto-assign the best volunteer for a given need.
 * Called after task verification.
 */
export async function autoAssignTask(needId) {
  try {
    const need = await Need.findById(needId);
    if (!need) {
      logger.warn(`[Dispatch] Need ${needId} not found for auto-assign`);
      return null;
    }

    if (need.volunteerAssignmentStatus !== "unassigned") {
      logger.info(
        `[Dispatch] Need ${needId} already has assignment status: ${need.volunteerAssignmentStatus}`,
      );
      return null;
    }

    const ranked = await findBestVolunteers(need);
    if (ranked.length === 0) {
      logger.info(`[Dispatch] No suitable volunteer found for need ${needId}`);
      return null;
    }

    const best = ranked[0];
    const volunteer = best.volunteer;

    // Update the need with assignment
    need.assignedVolunteer = {
      volunteerId: volunteer._id,
      volunteerName: volunteer.name,
      assignedAt: new Date(),
    };
    need.volunteerAssignmentStatus = "assigned";
    await need.save();

    // Increment volunteer's active task count and start shift if first task
    const updateFields = { $inc: { activeTaskCount: 1 } };
    const currentUser = await User.findById(volunteer._id);
    if (!currentUser.shiftStartedAt) {
      updateFields.$set = { shiftStartedAt: new Date() };
    }
    await User.findByIdAndUpdate(volunteer._id, updateFields);

    logger.info(
      `[Dispatch] Assigned need ${needId} to volunteer ${volunteer.name} (score: ${best.score.toFixed(2)})`,
      { breakdown: best.breakdown },
    );

    return {
      volunteerId: volunteer._id,
      volunteerName: volunteer.name,
      score: best.score,
      breakdown: best.breakdown,
    };
  } catch (error) {
    logger.error(`[Dispatch] Auto-assign error for need ${needId}:`, error);
    return null;
  }
}

/**
 * Get tasks assigned to a specific volunteer.
 */
export async function getVolunteerAssignments(volunteerId) {
  return Need.find({
    "assignedVolunteer.volunteerId": volunteerId,
    volunteerAssignmentStatus: { $in: ["assigned", "accepted"] },
  }).sort({ "assignedVolunteer.assignedAt": -1 });
}

/**
 * Volunteer accepts their assigned task.
 */
export async function acceptAssignment(needId, volunteerId) {
  const need = await Need.findOne({
    _id: needId,
    "assignedVolunteer.volunteerId": volunteerId,
    volunteerAssignmentStatus: "assigned",
  });

  if (!need) {
    return null;
  }

  need.assignedVolunteer.acceptedAt = new Date();
  need.volunteerAssignmentStatus = "accepted";
  if (need.status === "Verified") {
    need.status = "InProgress";
  }
  await need.save();

  logger.info(`[Dispatch] Volunteer ${volunteerId} accepted need ${needId}`);
  return need;
}

/**
 * Volunteer declines their assigned task. Re-dispatches to next best volunteer.
 */
export async function declineAssignment(needId, volunteerId) {
  const need = await Need.findOne({
    _id: needId,
    "assignedVolunteer.volunteerId": volunteerId,
    volunteerAssignmentStatus: { $in: ["assigned", "accepted"] },
  });

  if (!need) {
    return null;
  }

  need.assignedVolunteer.declinedAt = new Date();
  need.volunteerAssignmentStatus = "declined";
  await need.save();

  // Decrement the declining volunteer's active task count
  await User.findByIdAndUpdate(volunteerId, {
    $inc: { activeTaskCount: -1 },
  });

  logger.info(
    `[Dispatch] Volunteer ${volunteerId} declined need ${needId}, re-dispatching`,
  );

  // Reset assignment status and try to find next best volunteer
  need.volunteerAssignmentStatus = "unassigned";
  need.assignedVolunteer = undefined;
  await need.save();

  // Re-dispatch (the declined volunteer will still be available but
  // their higher activeTaskCount from other tasks naturally lowers their score)
  const result = await autoAssignTask(needId);
  return { declined: true, reassigned: !!result, newAssignment: result };
}

/**
 * Volunteer completes their assigned task.
 */
export async function completeAssignment(needId, volunteerId) {
  const need = await Need.findOne({
    _id: needId,
    "assignedVolunteer.volunteerId": volunteerId,
    volunteerAssignmentStatus: { $in: ["assigned", "accepted"] },
  });

  if (!need) {
    return null;
  }

  need.assignedVolunteer.completedAt = new Date();
  need.volunteerAssignmentStatus = "completed";
  need.status = "Completed";
  await need.save();

  // Update volunteer stats
  await User.findByIdAndUpdate(volunteerId, {
    $inc: { activeTaskCount: -1, completedTaskCount: 1 },
    $set: { lastTaskCompletedAt: new Date() },
  });

  logger.info(`[Dispatch] Volunteer ${volunteerId} completed need ${needId}`);
  return need;
}

/**
 * Get dispatch suggestions for a task (manager preview).
 * Returns ranked list of volunteers with scores.
 */
export async function getDispatchSuggestions(needId) {
  const need = await Need.findById(needId);
  if (!need) {
    return null;
  }

  const ranked = await findBestVolunteers(need);
  return ranked.map(({ volunteer, score, breakdown }) => ({
    volunteerId: volunteer._id,
    name: volunteer.name,
    skills: volunteer.skills,
    activeTaskCount: volunteer.activeTaskCount || 0,
    locationUpdatedAt: volunteer.location?.updatedAt,
    score: Math.round(score * 100),
    breakdown: {
      proximity: Math.round(breakdown.proximity * 100),
      skill: Math.round(breakdown.skill * 100),
      workload: Math.round(breakdown.workload * 100),
      fatigue: Math.round(breakdown.fatigue * 100),
    },
  }));
}

/**
 * Manager manually assigns a specific volunteer to a task.
 */
export async function manualAssignTask(needId, volunteerId) {
  const [need, volunteer] = await Promise.all([
    Need.findById(needId),
    User.findById(volunteerId),
  ]);

  if (!need || !volunteer) {
    return null;
  }

  need.assignedVolunteer = {
    volunteerId: volunteer._id,
    volunteerName: volunteer.name,
    assignedAt: new Date(),
  };
  need.volunteerAssignmentStatus = "assigned";
  await need.save();

  const updateFields = { $inc: { activeTaskCount: 1 } };
  if (!volunteer.shiftStartedAt) {
    updateFields.$set = { shiftStartedAt: new Date() };
  }
  await User.findByIdAndUpdate(volunteerId, updateFields);

  logger.info(
    `[Dispatch] Manager manually assigned need ${needId} to ${volunteer.name}`,
  );

  return {
    volunteerId: volunteer._id,
    volunteerName: volunteer.name,
  };
}
