import express from "express";
import {
  updateVolunteerLocation,
  updateAvailability,
  getMyAssignments,
  acceptTask,
  declineTask,
  completeTask,
  triggerDispatch,
  getSuggestions,
} from "../controllers/volunteerDispatchController.js";
import { requireAuth, requireManager } from "../middleware/authMiddleware.js";

const router = express.Router();

// Volunteer endpoints
router.put("/dispatch/location", requireAuth, updateVolunteerLocation);
router.put("/dispatch/availability", requireAuth, updateAvailability);
router.get("/dispatch/my-assignments", requireAuth, getMyAssignments);
router.post("/dispatch/accept/:needId", requireAuth, acceptTask);
router.post("/dispatch/decline/:needId", requireAuth, declineTask);
router.post("/dispatch/complete/:needId", requireAuth, completeTask);

// Manager endpoints
router.post("/dispatch/assign/:needId", requireManager, triggerDispatch);
router.get("/dispatch/suggestions/:needId", requireManager, getSuggestions);

export default router;
