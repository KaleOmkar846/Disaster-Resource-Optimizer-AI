import express from "express";
import { optimizeRouteHandler } from "../controllers/routeController.js";

const router = express.Router();

/**
 * POST /api/optimize-route
 * Route optimization endpoint
 */
router.post("/optimize-route", optimizeRouteHandler);

export default router;
