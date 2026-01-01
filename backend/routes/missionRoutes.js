import express from "express";
import mongoose from "mongoose";
import { sendSuccess, sendError } from "../utils/apiResponse.js";
import { logger } from "../utils/appLogger.js";
import { HTTP_STATUS } from "../constants/index.js";
import { requireAuth, requireManager } from "../middleware/authMiddleware.js";
import { dispatchAlertToStation } from "../services/emergencyAlertService.js";

const router = express.Router();

/**
 * GET /api/missions
 * Get all active missions with their routes
 */
router.get("/missions", requireAuth, async (req, res) => {
  try {
    const { status = "Active" } = req.query;

    const missions = await mongoose.connection.db
      .collection("missions")
      .find(status ? { status } : {})
      .sort({ timestamp: -1 })
      .limit(20)
      .toArray();

    // Check if any reports/needs in each mission have been dispatched
    const transformedMissions = await Promise.all(
      missions.map(async (mission) => {
        let hasDispatched = false;

        // Check reports for dispatched status
        if (mission.report_ids && mission.report_ids.length > 0) {
          const reportObjectIds = mission.report_ids
            .map((rid) => {
              if (rid instanceof mongoose.Types.ObjectId) return rid;
              if (typeof rid === "object" && rid.$oid)
                return new mongoose.Types.ObjectId(rid.$oid);
              if (mongoose.Types.ObjectId.isValid(rid))
                return new mongoose.Types.ObjectId(rid);
              return null;
            })
            .filter(Boolean);

          if (reportObjectIds.length > 0) {
            const dispatchedReport = await mongoose.connection.db
              .collection("reports")
              .findOne({
                _id: { $in: reportObjectIds },
                emergencyStatus: "dispatched",
              });
            if (dispatchedReport) hasDispatched = true;
          }
        }

        // Check needs for dispatched status if not already found
        if (!hasDispatched && mission.need_ids && mission.need_ids.length > 0) {
          const needObjectIds = mission.need_ids
            .map((nid) => {
              if (nid instanceof mongoose.Types.ObjectId) return nid;
              if (typeof nid === "object" && nid.$oid)
                return new mongoose.Types.ObjectId(nid.$oid);
              if (mongoose.Types.ObjectId.isValid(nid))
                return new mongoose.Types.ObjectId(nid);
              return null;
            })
            .filter(Boolean);

          if (needObjectIds.length > 0) {
            const dispatchedNeed = await mongoose.connection.db
              .collection("needs")
              .findOne({
                _id: { $in: needObjectIds },
                emergencyStatus: "dispatched",
              });
            if (dispatchedNeed) hasDispatched = true;
          }
        }

        return {
          id: mission._id.toString(),
          routes: mission.routes || [],
          reportIds: mission.report_ids || [],
          status: mission.status,
          numVehicles: mission.num_vehicles,
          timestamp: mission.timestamp,
          station: mission.station || null,
          hasDispatched, // true if any report/need has been dispatched
        };
      })
    );

    sendSuccess(res, transformedMissions, "Missions fetched successfully");
  } catch (error) {
    logger.error("Error fetching missions:", error);
    sendError(
      res,
      "Failed to fetch missions",
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error.message
    );
  }
});

/**
 * GET /api/missions/latest
 * Get the most recent active mission
 */
router.get("/missions/latest", requireAuth, async (req, res) => {
  try {
    const mission = await mongoose.connection.db
      .collection("missions")
      .findOne({ status: "Active" }, { sort: { timestamp: -1 } });

    if (!mission) {
      return sendSuccess(res, null, "No active mission found");
    }

    const transformed = {
      id: mission._id.toString(),
      routes: mission.routes || [],
      reportIds: mission.report_ids || [],
      status: mission.status,
      numVehicles: mission.num_vehicles,
      timestamp: mission.timestamp,
      station: mission.station || null,
    };

    sendSuccess(res, transformed, "Latest mission fetched");
  } catch (error) {
    logger.error("Error fetching latest mission:", error);
    sendError(
      res,
      "Failed to fetch mission",
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error.message
    );
  }
});

/**
 * PATCH /api/missions/:id/complete
 * Mark a mission as complete and update related reports/needs
 */
router.patch("/missions/:id/complete", requireManager, async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, "Invalid mission ID", HTTP_STATUS.BAD_REQUEST);
    }

    // Get the mission first to find related report IDs
    const mission = await mongoose.connection.db
      .collection("missions")
      .findOne({ _id: new mongoose.Types.ObjectId(id) });

    if (!mission) {
      return sendError(res, "Mission not found", HTTP_STATUS.NOT_FOUND);
    }

    // Update mission status to Completed
    await mongoose.connection.db.collection("missions").updateOne(
      { _id: new mongoose.Types.ObjectId(id) },
      {
        $set: {
          status: "Completed",
          completedAt: new Date().toISOString(),
        },
      }
    );

    // Update related reports to Completed status
    if (mission.report_ids && mission.report_ids.length > 0) {
      // report_ids may already be ObjectIds from Python agent
      const reportObjectIds = mission.report_ids
        .map((rid) => {
          if (rid instanceof mongoose.Types.ObjectId) return rid;
          if (typeof rid === "object" && rid.$oid)
            return new mongoose.Types.ObjectId(rid.$oid);
          if (mongoose.Types.ObjectId.isValid(rid))
            return new mongoose.Types.ObjectId(rid);
          return null;
        })
        .filter(Boolean);

      if (reportObjectIds.length > 0) {
        await mongoose.connection.db
          .collection("reports")
          .updateMany(
            { _id: { $in: reportObjectIds } },
            { $set: { status: "Completed" } }
          );
        logger.info(`Updated ${reportObjectIds.length} reports to Completed`);
      }
    }

    // Update related needs to Completed status
    if (mission.need_ids && mission.need_ids.length > 0) {
      // need_ids may already be ObjectIds from Python agent
      const needObjectIds = mission.need_ids
        .map((nid) => {
          if (nid instanceof mongoose.Types.ObjectId) return nid;
          if (typeof nid === "object" && nid.$oid)
            return new mongoose.Types.ObjectId(nid.$oid);
          if (mongoose.Types.ObjectId.isValid(nid))
            return new mongoose.Types.ObjectId(nid);
          return null;
        })
        .filter(Boolean);

      if (needObjectIds.length > 0) {
        await mongoose.connection.db
          .collection("needs")
          .updateMany(
            { _id: { $in: needObjectIds } },
            { $set: { status: "Completed" } }
          );
        logger.info(`Updated ${needObjectIds.length} needs to Completed`);
      }
    }

    logger.info(`Mission ${id} marked as complete`);
    sendSuccess(res, { id, status: "Completed" }, "Mission completed");
  } catch (error) {
    logger.error("Error completing mission:", error);
    sendError(
      res,
      "Failed to complete mission",
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error.message
    );
  }
});

/**
 * PATCH /api/missions/:id/reroute
 * Re-route a mission to a different station
 * This marks the old mission as cancelled, cancels alerts at previous station,
 * and triggers re-routing to the new station
 */
router.patch("/missions/:id/reroute", requireManager, async (req, res) => {
  try {
    const { id } = req.params;
    const { station } = req.body; // { type, name, lat, lon }

    if (!station || !station.type || !station.name) {
      return sendError(res, "Station info required", HTTP_STATUS.BAD_REQUEST);
    }

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, "Invalid mission ID", HTTP_STATUS.BAD_REQUEST);
    }

    // Get the current mission
    const mission = await mongoose.connection.db
      .collection("missions")
      .findOne({ _id: new mongoose.Types.ObjectId(id) });

    if (!mission) {
      return sendError(res, "Mission not found", HTTP_STATUS.NOT_FOUND);
    }

    // Collect all report/need IDs for this mission
    const allSourceIds = [];

    // Mark current mission as re-routed (cancelled)
    await mongoose.connection.db.collection("missions").updateOne(
      { _id: new mongoose.Types.ObjectId(id) },
      {
        $set: {
          status: "Rerouted",
          reroutedAt: new Date().toISOString(),
          reroutedTo: station,
        },
      }
    );

    // Reset related reports back to Analyzed status for re-processing
    if (mission.report_ids && mission.report_ids.length > 0) {
      const reportObjectIds = mission.report_ids
        .map((rid) => {
          if (rid instanceof mongoose.Types.ObjectId) return rid;
          if (typeof rid === "object" && rid.$oid)
            return new mongoose.Types.ObjectId(rid.$oid);
          if (mongoose.Types.ObjectId.isValid(rid))
            return new mongoose.Types.ObjectId(rid);
          return null;
        })
        .filter(Boolean);

      if (reportObjectIds.length > 0) {
        allSourceIds.push(...reportObjectIds);

        await mongoose.connection.db.collection("reports").updateMany(
          { _id: { $in: reportObjectIds } },
          {
            $set: {
              status: "Analyzed",
              dispatch_status: "Pending",
              emergencyStatus: "pending", // Reset to pending for new dispatch
              rerouted_to_station: station,
            },
            $unset: {
              mission_id: "",
              assigned_station: "",
              emergencyAlertId: "",
            },
          }
        );
        logger.info(
          `Reset ${reportObjectIds.length} reports for re-routing to ${station.name}`
        );
      }
    }

    // Reset related needs back to Verified status for re-processing
    if (mission.need_ids && mission.need_ids.length > 0) {
      const needObjectIds = mission.need_ids
        .map((nid) => {
          if (nid instanceof mongoose.Types.ObjectId) return nid;
          if (typeof nid === "object" && nid.$oid)
            return new mongoose.Types.ObjectId(nid.$oid);
          if (mongoose.Types.ObjectId.isValid(nid))
            return new mongoose.Types.ObjectId(nid);
          return null;
        })
        .filter(Boolean);

      if (needObjectIds.length > 0) {
        allSourceIds.push(...needObjectIds);

        await mongoose.connection.db.collection("needs").updateMany(
          { _id: { $in: needObjectIds } },
          {
            $set: {
              status: "Verified",
              dispatch_status: "Pending",
              emergencyStatus: "pending", // Reset to pending for new dispatch
              rerouted_to_station: station,
            },
            $unset: {
              mission_id: "",
              assigned_station: "",
              emergencyAlertId: "",
            },
          }
        );
        logger.info(
          `Reset ${needObjectIds.length} needs for re-routing to ${station.name}`
        );
      }
    }

    // Cancel existing emergency alerts for these reports/needs
    if (allSourceIds.length > 0) {
      const cancelledAlerts = await mongoose.connection.db
        .collection("emergencyalerts")
        .updateMany(
          {
            sourceId: { $in: allSourceIds },
            status: { $nin: ["cancelled", "resolved"] },
          },
          {
            $set: {
              status: "cancelled",
              cancelledAt: new Date().toISOString(),
              cancelReason: `Rerouted to ${station.name}`,
              "sentToStations.$[].status": "cancelled",
            },
          }
        );
      logger.info(
        `Cancelled ${cancelledAlerts.modifiedCount} emergency alerts for rerouting`
      );

      // Dispatch new alerts to the new station for each report/need
      const reportsCollection = mongoose.connection.db.collection("reports");
      const needsCollection = mongoose.connection.db.collection("needs");

      // Get the report IDs that were part of this mission
      if (mission.report_ids && mission.report_ids.length > 0) {
        const reportObjectIds = mission.report_ids
          .map((rid) => {
            if (rid instanceof mongoose.Types.ObjectId) return rid;
            if (typeof rid === "object" && rid.$oid)
              return new mongoose.Types.ObjectId(rid.$oid);
            if (mongoose.Types.ObjectId.isValid(rid))
              return new mongoose.Types.ObjectId(rid);
            return null;
          })
          .filter(Boolean);

        // Fetch the actual report documents and dispatch alerts
        const reports = await reportsCollection
          .find({ _id: { $in: reportObjectIds } })
          .toArray();

        for (const report of reports) {
          try {
            const alertResult = await dispatchAlertToStation(
              report,
              "Report",
              station
            );
            if (alertResult.success) {
              logger.info(
                `Dispatched reroute alert for report ${report._id} to ${station.name}`
              );
            }
          } catch (alertErr) {
            logger.warn(
              `Failed to dispatch alert for report ${report._id}: ${alertErr.message}`
            );
          }
        }
      }

      // Get the need IDs that were part of this mission
      if (mission.need_ids && mission.need_ids.length > 0) {
        const needObjectIds = mission.need_ids
          .map((nid) => {
            if (nid instanceof mongoose.Types.ObjectId) return nid;
            if (typeof nid === "object" && nid.$oid)
              return new mongoose.Types.ObjectId(nid.$oid);
            if (mongoose.Types.ObjectId.isValid(nid))
              return new mongoose.Types.ObjectId(nid);
            return null;
          })
          .filter(Boolean);

        // Fetch the actual need documents and dispatch alerts
        const needs = await needsCollection
          .find({ _id: { $in: needObjectIds } })
          .toArray();

        for (const need of needs) {
          try {
            const alertResult = await dispatchAlertToStation(
              need,
              "Need",
              station
            );
            if (alertResult.success) {
              logger.info(
                `Dispatched reroute alert for need ${need._id} to ${station.name}`
              );
            }
          } catch (alertErr) {
            logger.warn(
              `Failed to dispatch alert for need ${need._id}: ${alertErr.message}`
            );
          }
        }
      }
    }

    logger.info(`Mission ${id} re-routed to ${station.name}`);
    sendSuccess(
      res,
      { id, status: "Rerouted", newStation: station, alertsDispatched: true },
      `Mission re-routed to ${station.name}. Alerts dispatched to the new station.`
    );
  } catch (error) {
    logger.error("Error re-routing mission:", error);
    sendError(
      res,
      "Failed to re-route mission",
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error.message
    );
  }
});

export default router;
