import twilio from "twilio";
import config from "../config/index.js";
import { triageSMS } from "../services/geminiService.js";
import { geocodeLocation } from "../services/geocodeService.js";
import Need from "../models/Need.js";
import { fallbackTriage, extractLocationHint } from "../utils/smsParser.js";

const MessagingResponse = twilio.twiml.MessagingResponse;

const isProduction = config.nodeEnv === "production";

export function getTwilioWebhookValidator() {
  return twilio.webhook({ validate: isProduction });
}

async function buildTriageData(rawMessage) {
  try {
    const triageData = await triageSMS(rawMessage);
    console.log("Gemini Triage Result:", triageData);
    return triageData;
  } catch (error) {
    console.warn("Gemini failed, using fallback parser:", error.message);
    const fallback = fallbackTriage(rawMessage);
    console.log("Fallback Triage Result:", fallback);
    return fallback;
  }
}

async function resolveCoordinates(triageData, rawMessage) {
  const triagedLocation =
    triageData?.location && triageData.location !== "Unknown"
      ? triageData.location
      : null;
  const fallbackLocation = extractLocationHint(rawMessage);
  const locationQuery = triagedLocation || fallbackLocation;

  if (!locationQuery) {
    return null;
  }

  return geocodeLocation(locationQuery);
}

function respondWithMessage(res, statusCode, message) {
  const twiml = new MessagingResponse();
  twiml.message(message);
  res.writeHead(statusCode, { "Content-Type": "text/xml" });
  res.end(twiml.toString());
}

export async function handleIncomingSms(req, res) {
  const fromNumber = req.body.From;
  const rawMessage = req.body.Body;

  console.log(`Incoming message from ${fromNumber}: "${rawMessage}"`);

  try {
    const triageData = await buildTriageData(rawMessage);
    const coordinates = await resolveCoordinates(triageData, rawMessage);

    const newNeed = new Need({
      fromNumber,
      rawMessage,
      triageData,
      status: "Unverified",
      coordinates,
    });

    await newNeed.save();
    console.log(`New need saved to DB with ID: ${newNeed._id}`);

    respondWithMessage(
      res,
      200,
      `Your request has been received and logged. \nA volunteer will verify it soon. \nYour Report ID: ${newNeed._id}`
    );
  } catch (error) {
    console.error("Error in /api/sms webhook:", error);

    respondWithMessage(
      res,
      500,
      "We apologize, there was an error processing your request. Please try again."
    );
  }
}
