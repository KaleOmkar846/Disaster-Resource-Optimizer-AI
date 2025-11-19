import axios from "axios";

/**
 * Fetch all unverified tasks from the backend
 * @returns {Promise<Array>} Array of unverified tasks
 */
export async function getUnverifiedTasks() {
  try {
    const response = await axios.get("/api/tasks/unverified");
    return response.data;
  } catch (error) {
    console.error("Error fetching unverified tasks:", error);
    throw error;
  }
}

/**
 * Submit a verification for a task
 * @param {string|number} taskId - The ID of the task to verify
 * @param {string} volunteerNotes - Notes from the volunteer about the verification
 * @returns {Promise<Object>} Response from the backend
 */
export async function postVerification(taskId, volunteerNotes) {
  try {
    const response = await axios.post("/api/tasks/verify", {
      taskId,
      volunteerNotes,
    });
    return response.data;
  } catch (error) {
    console.error("Error posting verification:", error);
    throw error;
  }
}

/**
 * Fetch all needs that have coordinates for the dashboard map
 */
export async function getNeedsForMap() {
  try {
    const response = await axios.get("/api/needs/map");
    return response.data;
  } catch (error) {
    console.error("Error fetching needs for map:", error);
    throw error;
  }
}
