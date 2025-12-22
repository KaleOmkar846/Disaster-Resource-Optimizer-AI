import { asyncHandler } from "../middleware/index.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";
import {
  getRoute,
  getVolunteerRoute,
  getOptimizedRoute,
} from "../services/routeService.js";

/**
 * POST /api/routes/calculate
 * Calculate a route between waypoints
 */
export const calculateRoute = asyncHandler(async (req, res) => {
  const { waypoints, profile = "driving", steps = false } = req.body;

  if (!waypoints || !Array.isArray(waypoints) || waypoints.length < 2) {
    return sendError(res, "At least 2 waypoints are required", 400);
  }

  const route = await getRoute(waypoints, { profile, steps });
  sendSuccess(res, route, "Route calculated successfully");
});

/**
 * POST /api/routes/volunteer
 * Calculate a route for volunteer navigation to a task
 */
export const calculateVolunteerRoute = asyncHandler(async (req, res) => {
  const { origin, destination } = req.body;

  if (
    !origin ||
    !origin.lat ||
    (origin.lon === undefined && origin.lng === undefined)
  ) {
    return sendError(res, "Valid origin with lat/lon is required", 400);
  }

  if (
    !destination ||
    !destination.lat ||
    (destination.lon === undefined && destination.lng === undefined)
  ) {
    return sendError(res, "Valid destination with lat/lon is required", 400);
  }

  // Normalize coordinates
  const normalizedOrigin = {
    lat: origin.lat,
    lon: origin.lon ?? origin.lng,
  };
  const normalizedDestination = {
    lat: destination.lat,
    lon: destination.lon ?? destination.lng,
  };

  const route = await getVolunteerRoute(
    normalizedOrigin,
    normalizedDestination
  );
  sendSuccess(res, route, "Volunteer route calculated successfully");
});

/**
 * POST /api/routes/optimize
 * Calculate an optimized route for multiple stops (TSP)
 */
export const calculateOptimizedRoute = asyncHandler(async (req, res) => {
  const { waypoints, roundtrip = true } = req.body;

  if (!waypoints || !Array.isArray(waypoints) || waypoints.length < 2) {
    return sendError(res, "At least 2 waypoints are required", 400);
  }

  const route = await getOptimizedRoute(waypoints, { roundtrip });
  sendSuccess(res, route, "Optimized route calculated successfully");
});
