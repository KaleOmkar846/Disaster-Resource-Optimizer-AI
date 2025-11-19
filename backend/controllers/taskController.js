import Need from "../models/Need.js";

const MAX_UNVERIFIED = 50;
const MAX_VERIFIED = 100;
const MAX_MAP_NEEDS = 200;

const describeNeed = (need) =>
  need.triageData?.details || need.rawMessage || "No description";

const toTaskDto = (need) => ({
  id: need._id.toString(),
  taskId: need._id.toString(),
  description: describeNeed(need),
  notes: need.triageData?.location || "",
  location: need.triageData?.location,
  needType: need.triageData?.needType,
  urgency: need.triageData?.urgency,
  phoneNumber: need.fromNumber,
  status: need.status,
  createdAt: need.createdAt,
  lat: need.coordinates?.lat,
  lon: need.coordinates?.lon,
});

const toMapNeedDto = (need) => ({
  id: need._id.toString(),
  lat: need.coordinates?.lat,
  lon: need.coordinates?.lon,
  status: need.status,
  description: describeNeed(need),
  needType: need.triageData?.needType,
  urgency: need.triageData?.urgency,
  location: need.triageData?.location || need.coordinates?.formattedAddress,
  verifiedAt: need.verifiedAt,
  createdAt: need.createdAt,
});

export async function getUnverifiedTasks(req, res) {
  try {
    const unverifiedNeeds = await Need.find({ status: "Unverified" })
      .sort({ createdAt: -1 })
      .limit(MAX_UNVERIFIED);

    res.json(unverifiedNeeds.map(toTaskDto));
  } catch (error) {
    console.error("Error fetching unverified tasks:", error);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
}

export async function verifyTask(req, res) {
  try {
    const { taskId, volunteerNotes } = req.body;

    if (!taskId) {
      return res.status(400).json({ error: "taskId is required" });
    }

    const updatedNeed = await Need.findByIdAndUpdate(
      taskId,
      {
        status: "Verified",
        verificationNotes: volunteerNotes || "",
        verifiedAt: new Date(),
      },
      { new: true }
    );

    if (!updatedNeed) {
      return res.status(404).json({ error: "Task not found" });
    }

    res.json({
      success: true,
      message: "Task verified successfully",
      task: {
        id: updatedNeed._id,
        status: updatedNeed.status,
        verificationNotes: updatedNeed.verificationNotes,
        verifiedAt: updatedNeed.verifiedAt,
      },
    });
  } catch (error) {
    console.error("Error verifying task:", error);
    res.status(500).json({ error: "Failed to verify task" });
  }
}

export async function getVerifiedTasks(req, res) {
  try {
    const verifiedNeeds = await Need.find({ status: "Verified" })
      .sort({ verifiedAt: -1 })
      .limit(MAX_VERIFIED);

    res.json(verifiedNeeds.map(toTaskDto));
  } catch (error) {
    console.error("Error fetching verified tasks:", error);
    res.status(500).json({ error: "Failed to fetch verified tasks" });
  }
}

export async function getNeedsForMap(req, res) {
  try {
    const needs = await Need.find({ "coordinates.lat": { $exists: true } })
      .sort({ createdAt: -1 })
      .limit(MAX_MAP_NEEDS);

    const mapReadyNeeds = needs
      .map(toMapNeedDto)
      .filter(
        (need) => typeof need.lat === "number" && typeof need.lon === "number"
      );

    res.json(mapReadyNeeds);
  } catch (error) {
    console.error("Error fetching needs for map:", error);
    res.status(500).json({ error: "Failed to fetch map needs" });
  }
}
