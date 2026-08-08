import {
  registerEntitySecretCiphertext,
} from "@circle-fin/developer-controlled-wallets";
import "dotenv/config";

const apiKey = process.env.CIRCLE_API_KEY;
const entitySecret = process.env.CIRCLE_ENTITY_SECRET;

if (!apiKey) {
  throw new Error("CIRCLE_API_KEY is missing from .env");
}

if (!entitySecret) {
  throw new Error("CIRCLE_ENTITY_SECRET is missing from .env");
}

console.log("🔐 Registering Entity Secret with Circle...");

try {
  const response = await registerEntitySecretCiphertext({
    apiKey,
    entitySecret,
    recoveryFileDownloadPath: "./circle-recovery",
  });

  console.log("✅ Entity Secret registered successfully!");
  console.log("");
  console.log("Recovery file:");
  console.log(response.data?.recoveryFile);
  console.log("");
  console.log("Keep the recovery file somewhere secure.");
} catch (error) {
  console.error("❌ Entity Secret registration failed.");

  if (error?.response?.data) {
    console.error(error.response.data);
  } else {
    console.error(error);
  }

  process.exit(1);
}