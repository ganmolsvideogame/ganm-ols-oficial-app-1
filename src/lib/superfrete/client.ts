type SuperFreteEnvironment = "sandbox" | "production";

type FetchOptions = {
  method: "GET" | "POST";
  body?: unknown;
  timeoutMs?: number;
};

const DEFAULT_TIMEOUT_MS = 15000;

export class SuperFreteError extends Error {
  status: number;
  raw: string;

  constructor(message: string, status: number, raw: string) {
    super(message);
    this.status = status;
    this.raw = raw;
  }
}

function getEnvironment(): SuperFreteEnvironment {
  const env = (
    process.env.SUPERFRETE_ENV || process.env.SUPER_FRETE_ENV || ""
  ).toLowerCase();
  if (env === "production") {
    return "production";
  }
  return "sandbox";
}

function getBaseUrl(environment: SuperFreteEnvironment) {
  const override =
    process.env.SUPERFRETE_BASE_URL?.trim() ||
    process.env.SUPER_FRETE_BASE_URL?.trim();
  if (override) {
    return override.replace(/\/+$/, "");
  }
  return environment === "production"
    ? "https://api.superfrete.com"
    : "https://sandbox.superfrete.com";
}

function getToken(environment: SuperFreteEnvironment) {
  if (environment === "production") {
    return (
      process.env.SUPERFRETE_TOKEN?.trim() ||
      process.env.SUPER_FRETE_TOKEN?.trim() ||
      ""
    );
  }
  return (
    process.env.SUPERFRETE_TOKEN_SANDBOX?.trim() ||
    process.env.SUPER_FRETE_TOKEN_SANDBOX?.trim() ||
    process.env.SUPERFRETE_TOKEN?.trim() ||
    process.env.SUPER_FRETE_TOKEN?.trim() ||
    ""
  );
}

function getUserAgent() {
  return (
    process.env.SUPERFRETE_USER_AGENT ||
    process.env.SUPER_FRETE_USER_AGENT ||
    "GANM OLS 0.1 (contato@seusite.com)"
  );
}

export async function superfreteFetch(
  path: string,
  options: FetchOptions
): Promise<{ status: number; data: unknown; raw: string }> {
  const environment = getEnvironment();
  const baseUrl = getBaseUrl(environment);
  const token = getToken(environment);
  if (!token) {
    throw new Error("Token do SuperFrete nao configurado");
  }

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  );

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method: options.method,
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": getUserAgent(),
        accept: "application/json",
        "content-type": "application/json",
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });

    const raw = await response.text();
    let data: unknown = null;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      data = raw;
    }

    if (!response.ok) {
      throw new SuperFreteError(
        `Erro SuperFrete (${response.status}): ${raw || "sem detalhes"}`,
        response.status,
        raw
      );
    }

    return { status: response.status, data, raw };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Timeout ao conectar com a SuperFrete");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
