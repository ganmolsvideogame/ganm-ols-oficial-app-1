import "server-only";

type EnvOptions = {
  required?: boolean;
};

export function getTrimmedEnv(
  name: string,
  options: EnvOptions & { required: true }
): string;
export function getTrimmedEnv(
  name: string,
  options?: EnvOptions & { required?: false }
): string | null;
export function getTrimmedEnv(name: string, options: EnvOptions = {}) {
  const { required = true } = options;
  const raw = process.env[name];
  const value = typeof raw === "string" ? raw.trim() : "";

  if (!value) {
    if (required) {
      throw new Error(`Missing ${name}.`);
    }
    return null;
  }

  return value;
}

export function getMercadoPagoRedirectUri() {
  const value = getTrimmedEnv("MERCADOPAGO_REDIRECT_URI");
  try {
    // Validate format early to avoid sending malformed URLs.
    new URL(value);
  } catch {
    throw new Error("MERCADOPAGO_REDIRECT_URI invalido.");
  }
  return value;
}

export function getMercadoPagoClientId() {
  return getTrimmedEnv("MERCADOPAGO_CLIENT_ID");
}

export function getMercadoPagoClientSecret() {
  return getTrimmedEnv("MERCADOPAGO_CLIENT_SECRET");
}

export function getMercadoPagoAccessToken() {
  return getTrimmedEnv("MERCADOPAGO_ACCESS_TOKEN");
}

export function getBaseUrl(request: Request) {
  const envBaseUrl = getTrimmedEnv("APP_BASE_URL", { required: false });
  if (envBaseUrl) {
    return envBaseUrl;
  }
  const url = new URL(request.url);
  const proto =
    request.headers.get("x-forwarded-proto") || url.protocol.replace(":", "");
  const host = request.headers.get("x-forwarded-host") || url.host;
  return `${proto}://${host}`;
}
