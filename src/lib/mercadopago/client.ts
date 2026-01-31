import "server-only";

import { MercadoPagoConfig, Payment, Preference } from "mercadopago";

function getMercadoPagoClient() {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("Missing MERCADOPAGO_ACCESS_TOKEN.");
  }

  return new MercadoPagoConfig({ accessToken });
}

export function createPreferenceClient() {
  return new Preference(getMercadoPagoClient());
}

export function createPaymentClient() {
  return new Payment(getMercadoPagoClient());
}
