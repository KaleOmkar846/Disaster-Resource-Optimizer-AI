import User from "../models/UserModel.js";
import { asyncHandler, ApiError } from "../middleware/index.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { logger } from "../utils/appLogger.js";
import {
  autoAssignTask,
  getVolunteerAssignments,
  acceptAssignment,
  declineAssignment,
  completeAssignment,
  getDispatchSuggestions,
  manualAssignTask,
} from "../services/dispatchService.js";

/**
 * PUT /api/dispatch/location
 * Update volunteer's GPS location (called periodically from frontend)
 */
export const updateVolunteerLocation = asyncHandler(async (req, res) => {
  const { lat, lng } = req.body;

  if (typeof lat !== "number" || typeof lng !== "number") {
    throw new ApiError(400, "lat and lng are required as numbers");
  }

  await User.findByIdAndUpdate(req.session.userId, {
    $set: {
      "location.lat": lat,
      "location.lng": lng,
      "location.updatedAt": new Date(),
    },
  });

  sendSuccess(res, null, "Location updated");
});

/**
 * PUT /api/dispatch/availability
 * Update volunteer's availability status
 */
export const updateAvailability = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const validStatuses = ["available", "busy", "off_duty"];

  if (!validStatuses.includes(status)) {
    throw new ApiError(
      400,
      `Status must be one of: ${validStatuses.join(", ")}`,
    );
  }

  const user = await User.findByIdAndUpdate(
    req.session.userId,
    { availabilityStatus: status },
    { new: true },
  );

  // Reset shift tracking when going off duty
  if (status === "off_duty") {
    user.shiftStartedAt = null;
    await user.save();
  }

  // Start shift when becoming available (if not already started)
  if (
    status === "available" &&
    !user.shiftStartedAt &&
    user.activeTaskCount > 0
  ) {
    user.shiftStartedAt = new Date();
    await user.save();
  }

  sendSuccess(
    res,
    { availabilityStatus: user.availabilityStatus },
    "Availability updated",
  );
});

/**
 * GET /api/dispatch/my-assignments
 * Get tasks assigned to the current volunteer
 */
export const getMyAssignments = asyncHandler(async (req, res) => {
  const assignments = await getVolunteerAssignments(req.session.userId);

  const tasks = assignments.map((need) => ({
    id: need._id.toString(),
    description:
      need.triageData?.details || need.rawMessage || "No description",
    needType: need.triageData?.needType,
    urgency: need.triageData?.urgency,
    location: need.triageData?.location,
    lat: need.coordinates?.lat,
    lng: need.coordinates?.lng,
    status: need.volunteerAssignmentStatus,
    assignedAt: need.assignedVolunteer?.assignedAt,
    acceptedAt: need.assignedVolunteer?.acceptedAt,
    phoneNumber: need.fromNumber,
    createdAt: need.createdAt,
  }));

  sendSuccess(res, tasks, "Assignments retrieved");
});

/**
 * POST /api/dispatch/accept/:needId
 * Volunteer accepts assigned task
 */
export const acceptTask = asyncHandler(async (req, res) => {
  const result = await acceptAssignment(req.params.needId, req.session.userId);

  if (!result) {
    throw new ApiError(404, "Assignment not found or already processed");
  }

  sendSuccess(res, { id: result._id, status: "accepted" }, "Task accepted");
});

/**
 * POST /api/dispatch/decline/:needId
 * Volunteer declines assigned task (triggers re-dispatch)
 */
export const declineTask = asyncHandler(async (req, res) => {
  const result = await declineAssignment(req.params.needId, req.session.userId);

  if (!result) {
    throw new ApiError(404, "Assignment not found or already processed");
  }

  sendSuccess(
    res,
    { reassigned: result.reassigned },
    result.reassigned
      ? "Task declined and reassigned to another volunteer"
      : "Task declined (no other volunteer available)",
  );
});

/**
 * POST /api/dispatch/complete/:needId
 * Volunteer marks assigned task as complete
 */
export const completeTask = asyncHandler(async (req, res) => {
  const result = await completeAssignment(
    req.params.needId,
    req.session.userId,
  );

  if (!result) {
    throw new ApiError(404, "Assignment not found or already processed");
  }

  sendSuccess(res, { id: result._id, status: "completed" }, "Task completed");
});

/**
 * POST /api/dispatch/assign/:needId
 * Manager triggers dispatch for a specific need
 */
export const triggerDispatch = asyncHandler(async (req, res) => {
  const { volunteerId } = req.body;

  let result;
  if (volunteerId) {
    // Manual assignment to specific volunteer
    result = await manualAssignTask(req.params.needId, volunteerId);
  } else {
    // Auto-assign to best volunteer
    result = await autoAssignTask(req.params.needId);
  }

  if (!result) {
    throw new ApiError(
      404,
      volunteerId
        ? "Need or volunteer not found"
        : "No suitable volunteer found for this task",
    );
  }

  sendSuccess(res, result, `Task assigned to ${result.volunteerName}`);
});

/**
 * GET /api/dispatch/suggestions/:needId
 * Manager views ranked volunteer list for a task
 */
export const getSuggestions = asyncHandler(async (req, res) => {
  const suggestions = await getDispatchSuggestions(req.params.needId);

  if (suggestions === null) {
    throw new ApiError(404, "Need not found");
  }

  sendSuccess(res, suggestions, "Dispatch suggestions retrieved");
});
