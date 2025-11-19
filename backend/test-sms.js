import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const BASE_URL = process.env.SMS_TEST_URL || "http://127.0.0.1:3000";
const FROM_NUMBER = process.env.SMS_TEST_FROM || "+15555550123";
const TO_NUMBER = process.env.SMS_TEST_TO || "+18005550123";
const DELAY_MS = Number(process.env.SMS_TEST_DELAY_MS || 500);

const DEFAULT_MESSAGES = [
  "Need medical help at Koregaon Park urgently",
  "Require food packets near Pune Railway Station",
  "Water supply issue in Hadapsar",
  "Family stranded near Sinhagad Road, need rescue boat",
];

function buildTwilioLikePayload(message, index) {
  const params = new URLSearchParams();
  const timestamp = Date.now();

  params.append("SmsSid", `SM${timestamp}${index}`);
  params.append(
    "AccountSid",
    process.env.TWILIO_ACCOUNT_SID || "ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
  );
  params.append(
    "MessagingServiceSid",
    process.env.TWILIO_MESSAGING_SERVICE_SID ||
      "MGXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
  );
  params.append("From", FROM_NUMBER);
  params.append("To", TO_NUMBER);
  params.append("Body", message);
  params.append("NumMedia", "0");

  return params;
}

async function sendMessage(message, index) {
  const params = buildTwilioLikePayload(message, index);
  const url = `${BASE_URL}/api/sms`;

  console.log(`\n📨 Sending message ${index + 1}: "${message}"`);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const responseText = await response.text();
    console.log(`✅ Response [${response.status}]:\n${responseText}`);
    return true;
  } catch (error) {
    console.error("❌ Error sending SMS simulation:", error.message);
    return false;
  }
}

function parseCliMessages() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    return DEFAULT_MESSAGES;
  }
  return args;
}

async function run() {
  const messages = parseCliMessages();
  let success = true;

  for (const [index, message] of messages.entries()) {
    const result = await sendMessage(message, index);
    if (!result) {
      success = false;
    }

    if (index < messages.length - 1 && DELAY_MS > 0) {
      await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    }
  }

  if (!success) {
    process.exitCode = 1;
  }
}

run();
