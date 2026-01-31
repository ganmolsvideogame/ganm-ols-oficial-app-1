import fs from "fs";
import path from "path";

import {
  checkoutLabel,
  createCartLabel,
  getOrderInfo,
  printTags,
  quoteFreight,
} from "@/lib/superfrete/api";

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

const fromCep = process.env.TEST_FROM_CEP || "01001000";
const toCep = process.env.TEST_TO_CEP || "11930000";

async function run() {
  console.log("Cotando frete...");
  const quote = await quoteFreight({
    from: { postal_code: fromCep },
    to: { postal_code: toCep },
    services: "1",
    package: {
      weight: 1.2,
      height: 12,
      width: 22,
      length: 30,
    },
    options: {
      own_hand: false,
      receipt: false,
      insurance_value: 0,
      use_insurance_value: false,
    },
  });
  console.log("Quote:", quote);

  console.log("Criando etiqueta (pendente)...");
  const cart = await createCartLabel({
    platform: "GANM OLS",
    service: 1,
    from: {
      name: "Vendedor Teste",
      phone: "11999999999",
      email: "vendedor@ganm.com",
      postal_code: fromCep,
      address: "Rua Teste",
      number: "",
      district: "NA",
      city: "Sao Paulo",
      state_abbr: "SP",
      complement: "",
    },
    to: {
      name: "Comprador Teste",
      phone: "11999999999",
      email: "comprador@ganm.com",
      postal_code: toCep,
      address: "Rua Cliente",
      number: "",
      district: "NA",
      city: "Santos",
      state_abbr: "SP",
      complement: "",
    },
    products: [
      {
        name: "Produto teste",
        quantity: 1,
        unitary_value: 1,
      },
    ],
    volumes: [
      {
        height: 12,
        width: 22,
        length: 30,
        weight: 1.2,
      },
    ],
    options: {
      non_commercial: true,
    },
  });
  console.log("Cart:", cart);

  if (!cart.id) {
    throw new Error("Etiqueta nao criada.");
  }

  console.log("Finalizando pagamento...");
  await checkoutLabel({ id: cart.id });

  console.log("Buscando informacoes do pedido...");
  const info = await getOrderInfo(cart.id);
  console.log("Info:", info);

  console.log("Gerando print em lote...");
  const print = await printTags({ orders: [cart.id] });
  console.log("Print:", print);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
