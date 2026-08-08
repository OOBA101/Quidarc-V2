import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";

const apiKey = process.env.CIRCLE_API_KEY;
const entitySecret = process.env.CIRCLE_ENTITY_SECRET;

if (!apiKey) {
  throw new Error("CIRCLE_API_KEY is missing.");
}

if (!entitySecret) {
  throw new Error("CIRCLE_ENTITY_SECRET is missing.");
}

const client = initiateDeveloperControlledWalletsClient({
  apiKey,
  entitySecret,
});

async function main() {
  console.log("🔐 Creating Quidarc Circle Wallet Set...");

  const response = await client.createWalletSet({
    name: "Quidarc Agent Wallets",
  });

  const walletSet = response.data?.walletSet;

  if (!walletSet?.id) {
    console.error("❌ Circle did not return a Wallet Set ID.");
    console.error(response.data);
    process.exitCode = 1;
    return;
  }

  console.log("\n✅ Wallet Set created successfully!");
  console.log(`Wallet Set ID: ${walletSet.id}`);
  console.log(`Name: ${walletSet.name ?? "Quidarc Agent Wallets"}`);
}

main().catch((error) => {
  console.error("\n❌ Failed to create Wallet Set:");

  if (error?.response?.data) {
    console.error(error.response.data);
  } else {
    console.error(error);
  }

  process.exitCode = 1;
});