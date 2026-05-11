import "server-only";

import { createHash } from "crypto";

type SendMetaLeadEventInput = {
  email: string;
  phone?: string | null;
  leadId?: string | number | null;
  eventSourceUrl?: string | null;
};

type SendMetaCompleteRegistrationEventInput = {
  email: string;
  phone?: string | null;
  leadId?: string | number | null;
  eventSourceUrl?: string | null;
};

type MetaLeadResult = {
  ok: boolean;
  skipped?: boolean;
  status?: number;
  error?: string;
};

type SendMetaAffiliateClickEventInput = {
  eventSourceUrl: string;
  eventId?: string | null;
  clientIpAddress?: string | null;
  clientUserAgent?: string | null;
  contentId?: string | null;
  contentName?: string | null;
  partner?: string | null;
  value?: number | null;
  currency?: string | null;
};

type SendMetaPurchaseEventInput = {
  email: string;
  phone?: string | null;
  leadId?: string | number | null;
  fbc?: string | null;
  eventTime?: number;
  eventId?: string | null;
  eventSourceUrl?: string | null;
  attributionShare?: string;
  value?: number | null;
  currency?: string | null;
  contentIds?: string[];
  contentType?: string | null;
  contents?: Array<{
    id: string;
    quantity?: number | null;
    item_price?: number | null;
  }>;
};

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

function getMetaPixelId() {
  return (
    process.env.META_PIXEL_ID?.trim() ??
    process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() ??
    ""
  );
}

function getMetaAccessToken() {
  return process.env.META_CONVERSIONS_ACCESS_TOKEN?.trim() ?? "";
}

function getDefaultEventSourceUrl() {
  return (
    process.env.APP_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    undefined
  );
}

async function postMetaEvent(payload: Record<string, unknown>) {
  const pixelId = getMetaPixelId();
  const accessToken = getMetaAccessToken();

  if (!pixelId || !accessToken) {
    return { ok: false, skipped: true, error: "Meta CAPI not configured" } as const;
  }

  const requestPayload: Record<string, unknown> = { ...payload };
  const testEventCode = process.env.META_TEST_EVENT_CODE?.trim();
  if (testEventCode) {
    requestPayload.test_event_code = testEventCode;
  }

  const url = `https://graph.facebook.com/v22.0/${encodeURIComponent(
    pixelId
  )}/events?access_token=${encodeURIComponent(accessToken)}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(requestPayload),
      cache: "no-store",
    });

    if (!response.ok) {
      const details = await response.text();
      return {
        ok: false,
        status: response.status,
        error: details || `Meta API error ${response.status}`,
      } as const;
    }

    return { ok: true, status: response.status } as const;
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Meta API request failed",
    } as const;
  }
}

export async function sendMetaLeadEvent(
  input: SendMetaLeadEventInput
): Promise<MetaLeadResult> {
  const email = normalizeEmail(input.email);
  const phone = input.phone ? normalizePhone(input.phone) : "";

  if (!email) {
    return { ok: false, skipped: true, error: "Meta CAPI not configured" };
  }

  const userData: Record<string, unknown> = {
    em: [sha256(email)],
  };

  if (phone) {
    userData.ph = [sha256(phone)];
  }

  if (input.leadId !== null && input.leadId !== undefined && input.leadId !== "") {
    userData.lead_id = input.leadId;
  }

  const payload: Record<string, unknown> = {
    data: [
      {
        action_source: "system_generated",
        custom_data: {
          event_source: "crm",
          lead_event_source: "Your CRM",
        },
        event_name: "Lead",
        event_time: Math.floor(Date.now() / 1000),
        event_source_url: input.eventSourceUrl || getDefaultEventSourceUrl(),
        user_data: userData,
      },
    ],
  };

  return postMetaEvent(payload);
}

export async function sendMetaAffiliateClickEvent(
  input: SendMetaAffiliateClickEventInput
): Promise<MetaLeadResult> {
  const userData: Record<string, unknown> = {};

  if (input.clientIpAddress) {
    userData.client_ip_address = input.clientIpAddress;
  }

  if (input.clientUserAgent) {
    userData.client_user_agent = input.clientUserAgent;
  }

  const payload: Record<string, unknown> = {
    data: [
      {
        action_source: "website",
        custom_data: {
          content_name: input.contentName ?? undefined,
          content_ids: input.contentId ? [input.contentId] : undefined,
          content_type: "product",
          value:
            typeof input.value === "number" && Number.isFinite(input.value)
              ? input.value
              : undefined,
          currency: input.currency ?? "BRL",
        },
        event_id: input.eventId ? `${input.eventId}-checkout` : undefined,
        event_name: "InitiateCheckout",
        event_time: Math.floor(Date.now() / 1000),
        event_source_url: input.eventSourceUrl,
        user_data: userData,
      },
      {
        action_source: "website",
        custom_data: {
          event_source: "affiliate_click",
          lead_type: "affiliate_click",
          partner: input.partner ?? undefined,
          content_name: input.contentName ?? undefined,
          content_ids: input.contentId ? [input.contentId] : undefined,
          content_type: "product",
          value:
            typeof input.value === "number" && Number.isFinite(input.value)
              ? input.value
              : undefined,
          currency: input.currency ?? "BRL",
        },
        event_id: input.eventId || undefined,
        event_name: "Lead",
        event_time: Math.floor(Date.now() / 1000),
        event_source_url: input.eventSourceUrl,
        user_data: userData,
      },
    ],
  };

  return postMetaEvent(payload);
}

export async function sendMetaCompleteRegistrationEvent(
  input: SendMetaCompleteRegistrationEventInput
): Promise<MetaLeadResult> {
  const email = normalizeEmail(input.email);
  const phone = input.phone ? normalizePhone(input.phone) : "";

  if (!email) {
    return { ok: false, skipped: true, error: "Missing registration email" };
  }

  const userData: Record<string, unknown> = {
    em: [sha256(email)],
  };

  if (phone) {
    userData.ph = [sha256(phone)];
  }

  if (input.leadId !== null && input.leadId !== undefined && input.leadId !== "") {
    userData.lead_id = input.leadId;
  }

  const payload: Record<string, unknown> = {
    data: [
      {
        action_source: "website",
        custom_data: {
          event_source: "ganmols-signup",
          registration_flow: "account_create",
        },
        event_name: "CompleteRegistration",
        event_time: Math.floor(Date.now() / 1000),
        event_source_url: input.eventSourceUrl || getDefaultEventSourceUrl(),
        user_data: userData,
      },
    ],
  };

  return postMetaEvent(payload);
}

export async function sendMetaPurchaseEvent(
  input: SendMetaPurchaseEventInput
): Promise<MetaLeadResult> {
  const email = normalizeEmail(input.email);
  const phone = input.phone ? normalizePhone(input.phone) : "";
  const eventTime = Number.isFinite(input.eventTime)
    ? Number(input.eventTime)
    : Math.floor(Date.now() / 1000);

  if (!email) {
    return { ok: false, skipped: true, error: "Missing buyer email" };
  }

  const userData: Record<string, unknown> = {
    lead_id:
      input.leadId !== null &&
      input.leadId !== undefined &&
      String(input.leadId).trim() !== ""
        ? input.leadId
        : undefined,
    fbc: input.fbc ?? null,
    em: sha256(email),
    ph: phone ? sha256(phone) : undefined,
  };

  const normalizedContents = Array.isArray(input.contents)
    ? input.contents
        .map((item) => {
          const id = String(item.id ?? "").trim();
          if (!id) {
            return null;
          }

          const normalizedItem: Record<string, unknown> = {
            id,
          };

          if (typeof item.quantity === "number" && item.quantity > 0) {
            normalizedItem.quantity = item.quantity;
          }

          if (
            typeof item.item_price === "number" &&
            Number.isFinite(item.item_price) &&
            item.item_price >= 0
          ) {
            normalizedItem.item_price = item.item_price;
          }

          return normalizedItem;
        })
        .filter((item): item is Record<string, unknown> => Boolean(item))
    : [];

  const payload: Record<string, unknown> = {
    data: [
      {
        event_name: "Purchase",
        event_time: eventTime,
        action_source: "website",
        event_id: input.eventId || undefined,
        event_source_url: input.eventSourceUrl || getDefaultEventSourceUrl(),
        user_data: userData,
        attribution_data: {
          attribution_share: input.attributionShare ?? "0.3",
        },
        custom_data: {
          currency: input.currency ?? "BRL",
          value:
            typeof input.value === "number" && Number.isFinite(input.value)
              ? input.value
              : undefined,
          content_ids:
            Array.isArray(input.contentIds) && input.contentIds.length > 0
              ? input.contentIds
              : undefined,
          content_type: input.contentType ?? "product",
          contents: normalizedContents.length > 0 ? normalizedContents : undefined,
          lead_event_source: "Your CRM",
          event_source: "crm",
        },
        original_event_data: {
          event_name: "Purchase",
          event_time: eventTime,
        },
      },
    ],
  };

  return postMetaEvent(payload);
}
