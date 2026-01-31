type MelhorEnvioEnvironment = "sandbox" | "production";

type ShippingQuoteInput = {
  fromZipcode: string;
  toZipcode: string;
  weightGrams: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  insuranceValueCents?: number | null;
};

type ShippingQuoteResult = {
  serviceId: string | null;
  serviceName: string;
  priceCents: number;
  estimatedDays: number | null;
  carrier: string | null;
};

const DEFAULT_ENVIRONMENT: MelhorEnvioEnvironment = "sandbox";

function getEnvironment(): MelhorEnvioEnvironment {
  const env = (process.env.MELHOR_ENVIO_ENV || "").toLowerCase();
  if (env === "production") {
    return "production";
  }
  if (env === "sandbox" || env === "test" || env === "teste") {
    return "sandbox";
  }
  return DEFAULT_ENVIRONMENT;
}

function getBaseUrl(environment: MelhorEnvioEnvironment) {
  return environment === "production"
    ? "https://melhorenvio.com.br"
    : "https://sandbox.melhorenvio.com.br";
}

function normalizeZipcode(value: string) {
  return value.replace(/\D/g, "");
}

function parsePriceToCents(raw: unknown) {
  const parsed = typeof raw === "string" ? Number.parseFloat(raw) : Number(raw);
  if (!Number.isFinite(parsed)) {
    return Number.POSITIVE_INFINITY;
  }
  return Math.round(parsed * 100);
}

function parseEstimatedDays(raw: unknown) {
  const parsed = typeof raw === "string" ? Number.parseInt(raw, 10) : Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function calculateShipping(
  input: ShippingQuoteInput
): Promise<ShippingQuoteResult> {
  const environment = getEnvironment();
  const token =
    (environment === "sandbox"
      ? process.env.MELHOR_ENVIO_TOKEN_SANDBOX
      : process.env.MELHOR_ENVIO_TOKEN) ??
    process.env.MELHOR_ENVIO_TOKEN;
  const trimmedToken = token?.trim();
  if (!trimmedToken) {
    throw new Error("Token do Melhor Envio nao configurado");
  }

  const baseUrl = getBaseUrl(environment);
  const normalizedFrom = normalizeZipcode(input.fromZipcode);
  const normalizedTo = normalizeZipcode(input.toZipcode);
  const weightKg = Math.max(0.01, input.weightGrams / 1000);
  const insuranceValue = input.insuranceValueCents
    ? Math.max(0, input.insuranceValueCents) / 100
    : undefined;

  const response = await fetch(`${baseUrl}/api/v2/me/shipment/calculate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${trimmedToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent":
        process.env.MELHOR_ENVIO_USER_AGENT || "ganm-ols-marketplace",
    },
    body: JSON.stringify({
      from: { postal_code: normalizedFrom },
      to: { postal_code: normalizedTo },
      package: {
        weight: weightKg,
        length: input.lengthCm,
        width: input.widthCm,
        height: input.heightCm,
      },
      insurance_value: insuranceValue,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Erro no Melhor Envio (${response.status}): ${text || "sem detalhes"}`
    );
  }

  const data = (await response.json()) as Array<Record<string, unknown>>;
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("Nenhuma opcao de envio retornada");
  }

  const validServices = data
    .map((service) => {
      const priceCents = parsePriceToCents(service.custom_price ?? service.price);
      return {
        raw: service,
        priceCents,
      };
    })
    .filter(
      (service) =>
        Number.isFinite(service.priceCents) && service.priceCents >= 0
    )
    .sort((a, b) => a.priceCents - b.priceCents);

  if (validServices.length === 0) {
    throw new Error("Nenhuma opcao de envio valida");
  }

  const chosen = validServices[0].raw;
  return {
    serviceId: typeof chosen.id === "string" ? chosen.id : null,
    serviceName:
      typeof chosen.name === "string"
        ? chosen.name
        : typeof chosen.service === "string"
          ? chosen.service
          : "Envio",
    priceCents: validServices[0].priceCents,
    estimatedDays: parseEstimatedDays(
      chosen.delivery_time ?? chosen.delivery_range ?? chosen.delivery
    ),
    carrier: typeof chosen.company === "string" ? chosen.company : null,
  };
}
