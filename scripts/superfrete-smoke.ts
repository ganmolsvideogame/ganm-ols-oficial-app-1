import { loadEnvConfig } from "@next/env";

import { getOrderInfo } from "@/lib/superfrete/api";

async function run() {
  loadEnvConfig(process.cwd(), true);
  const token =
    process.env.SUPERFRETE_TOKEN?.trim() ||
    process.env.SUPER_FRETE_TOKEN?.trim() ||
    process.env.SUPERFRETE_TOKEN_SANDBOX?.trim() ||
    process.env.SUPER_FRETE_TOKEN_SANDBOX?.trim();
  if (!token) {
    throw new Error("Missing SUPERFRETE_TOKEN or SUPERFRETE_TOKEN_SANDBOX.");
  }

  const env = process.env.SUPERFRETE_ENV || "sandbox";
  const baseUrl = process.env.SUPERFRETE_BASE_URL || "default";
  console.log(`SuperFrete smoke: env=${env} base=${baseUrl}`);

  const tagId = process.env.SUPERFRETE_SMOKE_TAG_ID?.trim();
  if (!tagId) {
    console.log("SUPERFRETE_SMOKE_TAG_ID not set; skipping remote call.");
    return;
  }

  const info = await getOrderInfo(tagId);
  console.log("Order info:", {
    status: info.status,
    tracking: info.tracking,
    printUrl: info.printUrl,
  });
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error(`SuperFrete smoke failed: ${message}`);
  process.exit(1);
});
