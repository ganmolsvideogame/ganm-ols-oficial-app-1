type SuperFreteEnvironment = "sandbox" | "production";

type ShippingQuoteInput = {
  fromZipcode: string;
  toZipcode: string;
  weightGrams: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  insuranceValueCents?: number | null;
  serviceId?: string | null;
};

type ShippingQuoteResult = {
  serviceId: string | null;
  serviceName: string;
  priceCents: number;
  estimatedDays: number | null;
  carrier: string | null;
};

type ShippingOption = ShippingQuoteResult & {
  hasError: boolean;
  errorMessage?: string | null;
};

const DEFAULT_ENVIRONMENT: SuperFreteEnvironment = "sandbox";

function getEnvironment(): SuperFreteEnvironment {
  const env = (process.env.SUPER_FRETE_ENV || "").toLowerCase();
  if (env === "production") {
    return "production";
  }
  if (env === "sandbox" || env === "test" || env === "teste") {
    return "sandbox";
  }
  return DEFAULT_ENVIRONMENT;
}

function getBaseUrl(environment: SuperFreteEnvironment) {
  return environment === "production"
    ? "https://api.superfrete.com"
    : "https://sandbox.superfrete.com";
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

function extractEstimatedDays(service: Record<string, unknown>) {
  const direct = parseEstimatedDays(service.delivery_time);
  if (direct) {
    return direct;
  }
  const range = service.delivery_range as Record<string, unknown> | undefined;
  const min = range ? parseEstimatedDays(range.min) : null;
  const max = range ? parseEstimatedDays(range.max) : null;
  return min ?? max ?? null;
}

export async function calculateShipping(
  input: ShippingQuoteInput
): Promise<ShippingQuoteResult> {
  const options = await calculateShippingOptions(input);
  if (options.length === 0) {
    throw new Error("Nenhuma opcao de envio valida");
  }
  return options[0];
}

export async function calculateShippingOptions(
  input: ShippingQuoteInput
): Promise<ShippingOption[]> {
  const environment = getEnvironment();
  const token =
    (environment === "sandbox"
      ? process.env.SUPER_FRETE_TOKEN_SANDBOX
      : process.env.SUPER_FRETE_TOKEN) ?? process.env.SUPER_FRETE_TOKEN;
  const trimmedToken = token?.trim();
  if (!trimmedToken) {
    throw new Error("Token do Super Frete nao configurado");
  }

  const services =
    input.serviceId?.trim() ||
    process.env.SUPER_FRETE_SERVICES?.trim() ||
    "1,2,17";
  const userAgent =
    process.env.SUPER_FRETE_USER_AGENT ||
    "ganm-ols-marketplace (visualindentitymindsewt@gmail.com)";

  const baseUrl = getBaseUrl(environment);
  const normalizedFrom = normalizeZipcode(input.fromZipcode);
  const normalizedTo = normalizeZipcode(input.toZipcode);
  const weightKg = Math.max(0.01, input.weightGrams / 1000);
  const rawInsuranceCents = Math.max(0, input.insuranceValueCents ?? 0);
  const minInsuranceCents = 2563;
  const insuranceValue =
    rawInsuranceCents >= minInsuranceCents ? rawInsuranceCents / 100 : 0;

  const response = await fetch(`${baseUrl}/api/v0/calculator`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${trimmedToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": userAgent,
    },
    body: JSON.stringify({
      from: { postal_code: normalizedFrom },
      to: { postal_code: normalizedTo },
      services,
      options: {
        own_hand: false,
        receipt: false,
        insurance_value: insuranceValue,
        use_insurance_value: insuranceValue > 0,
      },
      package: {
        weight: weightKg,
        height: input.heightCm,
        width: input.widthCm,
        length: input.lengthCm,
      },
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Erro no Super Frete (${response.status}): ${text || "sem detalhes"}`
    );
  }

  const data = (await response.json()) as Array<Record<string, unknown>>;
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("Nenhuma opcao de envio retornada");
  }

  const mapped = data.map((service) => {
    const company = service.company as Record<string, unknown> | undefined;
    const serviceId =
      typeof service.id === "number"
        ? String(service.id)
        : typeof service.id === "string"
          ? service.id
          : null;
    const errorMessage =
      typeof service.error === "string"
        ? service.error
        : typeof service.error_message === "string"
          ? service.error_message
          : typeof service.message === "string"
            ? service.message
            : null;
    return {
      serviceId,
      serviceName: typeof service.name === "string" ? service.name : "Envio",
      priceCents: parsePriceToCents(service.price),
      estimatedDays: extractEstimatedDays(service),
      carrier: typeof company?.name === "string" ? company.name : null,
      hasError: service.has_error === true,
      errorMessage,
    };
  });

  const valid = mapped
    .filter(
      (service) =>
        !service.hasError &&
        Number.isFinite(service.priceCents) &&
        service.priceCents >= 0
    )
    .sort((a, b) => a.priceCents - b.priceCents);

  if (valid.length === 0) {
    const errorDetails = mapped
      .map((service) => service.errorMessage)
      .filter((message): message is string => Boolean(message))
      .filter((message, index, all) => all.indexOf(message) === index)
      .slice(0, 3)
      .join(" | ");
    const suffix = errorDetails ? `: ${errorDetails}` : "";
    throw new Error(`Nenhuma opcao de envio valida${suffix}`);
  }

  return valid;
}
