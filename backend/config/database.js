import mongoose from "mongoose";

/**
 * Connect to MongoDB database
 * @param {string} uri - MongoDB connection URI
 * @returns {Promise<void>}
 */
export async function connectDatabase(uri) {
  try {
    await mongoose.connect(uri);
    console.log("MongoDB Connected");
  } catch (err) {
    console.error("MongoDB Connection Error:", err);
    throw err;
  }
}

export default { connectDatabase };
