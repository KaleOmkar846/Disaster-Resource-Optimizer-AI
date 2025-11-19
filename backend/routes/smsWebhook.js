import express from "express";
import {
  getTwilioWebhookValidator,
  handleIncomingSms,
} from "../controllers/smsController.js";

const router = express.Router();

router.post("/sms", getTwilioWebhookValidator(), handleIncomingSms);

export default router;
