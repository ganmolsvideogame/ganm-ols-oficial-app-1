import fs from "fs";
import path from "path";

import { createClient } from "@supabase/supabase-js";
import { checkoutLabel, getOrderInfo, getPrintableUrl } from "@/lib/superfrete/api";

function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) {
    return;
  }
  const lines = fs.readFileSync(envPath, "utf-8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const index = trimmed.indexOf("=");
    if (index <= 0) {
      continue;
    }
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadEnvLocal();

const orderId = process.argv[2];

if (!orderId) {
  console.error("Informe o order_id. Ex: tsx scripts/release-superfrete.ts <id>");
  process.exit(1);
}

async function run() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    throw new Error("Missing Supabase service role configuration.");
  }
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });
  const { data: order } = await admin
    .from("orders")
    .select("id, superfrete_id, superfrete_status, superfrete_tracking")
    .eq("id", orderId)
    .maybeSingle();

  if (!order?.superfrete_id) {
    throw new Error("Pedido sem superfrete_id.");
  }

  if (order.superfrete_status === "released" && order.superfrete_tracking) {
    console.log("Etiqueta ja liberada.");
    return;
  }

  console.log("Finalizando pagamento da etiqueta...");
  await checkoutLabel({ id: order.superfrete_id });

  console.log("Buscando informacoes da etiqueta...");
  const info = await getOrderInfo(order.superfrete_id);
  const printOverride =
    info.status === "released"
      ? await getPrintableUrl(order.superfrete_id)
      : null;
  const printUrl = printOverride?.url || info.printUrl;

  await admin
    .from("orders")
    .update({
      superfrete_status: info.status ?? "released",
      superfrete_tracking: info.tracking,
      superfrete_print_url: printUrl,
      superfrete_raw_info: info.raw,
    })
    .eq("id", orderId);

  console.log("Etiqueta atualizada:", {
    status: info.status,
    tracking: info.tracking,
    printUrl: info.printUrl,
  });
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
