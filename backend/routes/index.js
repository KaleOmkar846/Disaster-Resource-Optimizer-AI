import express from "express";
import smsWebhookRoutes from "./smsWebhook.js";
import tasksRoutes from "./tasks.js";
import optimizationRoutes from "./optimization.js";

const router = express.Router();

router.use(smsWebhookRoutes);
router.use(tasksRoutes);
router.use(optimizationRoutes);

export default router;
