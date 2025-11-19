import { db } from "./db.js";
import { postVerification } from "./apiService.js";

/**
 * Verify a task - handles both online and offline scenarios
 * @param {Object} task - Task object with id and notes
 * @returns {Promise<Object>} Response from API or offline status
 */
export async function verifyTask(task) {
  if (navigator.onLine) {
    // Online: Call the API directly
    const response = await postVerification(task.id, task.notes || "");
    return response;
  } else {
    // Offline: Store in IndexedDB for later sync so useSyncManager can process it
    await db.pendingVerifications.add({
      taskId: task.id,
      data: {
        notes: task.notes || "",
        description: task.description,
        timestamp: Date.now(),
      },
      timestamp: Date.now(),
    });
    return { status: "offline-pending" };
  }
}
