import Dexie from "dexie";

// Create a new Dexie database named 'auraDB'
export const db = new Dexie("auraDB");

// Define the database schema
db.version(1).stores({
  // pendingVerifications: auto-incrementing primary key 'id', indexed 'taskId'
  pendingVerifications: "++id, taskId",
});
