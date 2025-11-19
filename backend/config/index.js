import dotenv from "dotenv";

// Load environment variables
dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  mongoUri: process.env.MONGO_URI,
  geminiApiKey: process.env.GEMINI_API_KEY,
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
  },
  geocode: {
    defaultRegion: process.env.GEOCODE_DEFAULT_REGION || "Pune, India",
  },
  nodeEnv: process.env.NODE_ENV || "development",
};

export default config;
