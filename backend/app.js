import express from "express";
import cors from "cors";
import apiRouter from "./routes/index.js";

/**
 * Creates and configures the Express application instance.
 * Keeping this logic isolated makes the HTTP layer easier to test and extend.
 */
export function createApp() {
  const app = express();

  // Global middleware
  app.use(cors());
  app.use(express.urlencoded({ extended: false }));
  app.use(express.json());

  // API routes
  app.use("/api", apiRouter);

  app.get("/", (req, res) => {
    res.json({
      message: "Disaster Response Resource Optimization Platform API",
    });
  });

  return app;
}

export default createApp;
