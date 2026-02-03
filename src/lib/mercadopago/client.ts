import "server-only";

import { MercadoPagoConfig, Payment, Preference } from "mercadopago";
import { getMercadoPagoAccessToken } from "@/lib/mercadopago/env";

function getMercadoPagoClient() {
  const accessToken = getMercadoPagoAccessToken();

  return new MercadoPagoConfig({ accessToken });
}

export function createPreferenceClient() {
  return new Preference(getMercadoPagoClient());
}

export function createPaymentClient() {
  return new Payment(getMercadoPagoClient());
}
