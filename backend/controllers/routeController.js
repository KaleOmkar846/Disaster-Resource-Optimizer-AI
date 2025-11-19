import { optimizeRoute } from "../services/routeOptimizationService.js";

/**
 * POST /api/optimize-route
 * Optimizes a delivery route from depot to multiple stops
 */
export async function optimizeRouteHandler(req, res) {
  try {
    const { depot, stops } = req.body;

    const orderedRoute = optimizeRoute({ depot, stops });

    res.json({
      optimized_route: orderedRoute,
    });
  } catch (error) {
    console.error(`Error during optimization: ${error.message}`);

    const statusCode = error.message === "Missing depot or stops" ? 400 : 500;

    res.status(statusCode).json({
      detail: error.message || "An error occurred during route optimization",
    });
  }
}
