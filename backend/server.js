import config from "./config/index.js";
import { connectDatabase } from "./config/database.js";
import { createApp } from "./app.js";

async function startServer() {
  try {
    await connectDatabase(config.mongoUri);
    const app = createApp();

    app.listen(config.port, () => {
      console.log(`Server is running on port ${config.port}`);
      console.log(
        `Twilio Webhook URL: http://localhost:${config.port}/api/sms`
      );
      console.log(
        `Use ngrok to expose this URL for Twilio webhook configuration`
      );
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
