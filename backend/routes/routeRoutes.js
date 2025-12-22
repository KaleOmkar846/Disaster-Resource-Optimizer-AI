import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import {
  calculateRoute,
  calculateVolunteerRoute,
  calculateOptimizedRoute,
} from "../controllers/routeController.js";

const router = express.Router();

// Route calculation endpoints
router.post("/routes/calculate", requireAuth, calculateRoute);
router.post("/routes/volunteer", requireAuth, calculateVolunteerRoute);
router.post("/routes/optimize", requireAuth, calculateOptimizedRoute);

export default router;
