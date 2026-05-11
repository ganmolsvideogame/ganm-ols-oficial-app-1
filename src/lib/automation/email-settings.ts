import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

type SiteSettingRow = {
  key: string;
  value: string | null;
};

export type EmailAutomationSettings = {
  sellerLifecycleHour: number;
  sellerOnboardingEnabled: boolean;
  sellerOnboardingDays: number[];
  sellerListingRecoveryEnabled: boolean;
  sellerListingRecoveryHours: number[];
  sellerPostListingEnabled: boolean;
  sellerPostListingDays: number[];
  sellerRelationshipEnabled: boolean;
  sellerRelationshipDays: number[];
  sellerProfileReminderEnabled: boolean;
  sellerProfileReminderIntervalDays: number;
  sellerProfileReminderHour: number;
  buyerAbandonedCartEnabled: boolean;
  buyerAbandonedCartDelayHours: number;
  blogBroadcastEnabled: boolean;
  blogBroadcastHour: number;
  blogBroadcastAudience: "newsletter" | "all-users" | "admins";
  lifecycleNotificationsEnabled: boolean;
  frequencyCapHours: number;
};

export const EMAIL_AUTOMATION_SETTING_KEYS = {
  sellerLifecycleHour: "seller_lifecycle_hour",
  sellerOnboardingEnabled: "seller_onboarding_enabled",
  sellerOnboardingDays: "seller_onboarding_days",
  sellerListingRecoveryEnabled: "seller_listing_recovery_enabled",
  sellerListingRecoveryHours: "seller_listing_recovery_hours",
  sellerPostListingEnabled: "seller_post_listing_enabled",
  sellerPostListingDays: "seller_post_listing_days",
  sellerRelationshipEnabled: "seller_relationship_enabled",
  sellerRelationshipDays: "seller_relationship_days",
  sellerProfileReminderEnabled: "seller_profile_reminder_enabled",
  sellerProfileReminderIntervalDays: "seller_profile_reminder_interval_days",
  sellerProfileReminderHour: "seller_profile_reminder_hour",
  buyerAbandonedCartEnabled: "buyer_abandoned_cart_enabled",
  buyerAbandonedCartDelayHours: "buyer_abandoned_cart_delay_hours",
  blogBroadcastEnabled: "blog_broadcast_enabled",
  blogBroadcastHour: "blog_broadcast_hour",
  blogBroadcastAudience: "blog_broadcast_audience",
  lifecycleNotificationsEnabled: "lifecycle_notifications_enabled",
  frequencyCapHours: "lifecycle_frequency_cap_hours",
} as const;

const DEFAULT_SETTINGS: EmailAutomationSettings = {
  sellerLifecycleHour: 9,
  sellerOnboardingEnabled: true,
  sellerOnboardingDays: [0, 2, 5, 10],
  sellerListingRecoveryEnabled: true,
  sellerListingRecoveryHours: [1, 24, 72],
  sellerPostListingEnabled: true,
  sellerPostListingDays: [3, 7, 14],
  sellerRelationshipEnabled: true,
  sellerRelationshipDays: [15, 30],
  sellerProfileReminderEnabled: true,
  sellerProfileReminderIntervalDays: 2,
  sellerProfileReminderHour: 11,
  buyerAbandonedCartEnabled: true,
  buyerAbandonedCartDelayHours: 4,
  blogBroadcastEnabled: true,
  blogBroadcastHour: 10,
  blogBroadcastAudience: "newsletter",
  lifecycleNotificationsEnabled: true,
  frequencyCapHours: 8,
};

function parseBoolean(value: string | null | undefined, fallback: boolean) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) {
    return fallback;
  }
  if (["1", "true", "on", "yes", "sim"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "off", "no", "nao"].includes(normalized)) {
    return false;
  }
  return fallback;
}

function parsePositiveNumber(value: string | null | undefined, fallback: number, min = 0) {
  const parsed = Number.parseInt(String(value ?? "").trim(), 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(min, parsed);
}

function parseBroadcastAudience(
  value: string | null | undefined,
  fallback: EmailAutomationSettings["blogBroadcastAudience"]
) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "admins" || normalized === "newsletter" || normalized === "all-users") {
    return normalized;
  }
  return fallback;
}

function parseNumberList(
  value: string | null | undefined,
  fallback: number[],
  min = 0
) {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    return fallback;
  }

  const values = normalized
    .split(",")
    .map((part) => Number.parseInt(part.trim(), 10))
    .filter((part) => Number.isFinite(part))
    .map((part) => Math.max(min, part));

  if (values.length === 0) {
    return fallback;
  }

  return Array.from(new Set(values)).sort((left, right) => left - right);
}

function rowsToMap(rows: SiteSettingRow[]) {
  return new Map(rows.map((row) => [row.key, row.value]));
}

export function stringifySchedule(values: number[]) {
  return values.join(", ");
}

export function formatDaySchedule(values: number[]) {
  return values.map((value) => `D${value}`).join(" | ");
}

export function formatHourSchedule(values: number[]) {
  return values.map((value) => `${value}h`).join(" | ");
}

export function formatClockHour(value: number) {
  const normalized = Math.max(0, Math.min(23, value));
  return `${String(normalized).padStart(2, "0")}:00`;
}

export async function loadEmailAutomationSettings(admin: SupabaseClient) {
  const keys = Object.values(EMAIL_AUTOMATION_SETTING_KEYS);
  const { data } = await admin
    .from("site_settings")
    .select("key, value")
    .in("key", keys);

  const map = rowsToMap((data ?? []) as SiteSettingRow[]);

  return {
    sellerLifecycleHour: Math.min(
      23,
      parsePositiveNumber(
        map.get(EMAIL_AUTOMATION_SETTING_KEYS.sellerLifecycleHour),
        DEFAULT_SETTINGS.sellerLifecycleHour,
        0
      )
    ),
    sellerOnboardingEnabled: parseBoolean(
      map.get(EMAIL_AUTOMATION_SETTING_KEYS.sellerOnboardingEnabled),
      DEFAULT_SETTINGS.sellerOnboardingEnabled
    ),
    sellerOnboardingDays: parseNumberList(
      map.get(EMAIL_AUTOMATION_SETTING_KEYS.sellerOnboardingDays),
      DEFAULT_SETTINGS.sellerOnboardingDays
    ),
    sellerListingRecoveryEnabled: parseBoolean(
      map.get(EMAIL_AUTOMATION_SETTING_KEYS.sellerListingRecoveryEnabled),
      DEFAULT_SETTINGS.sellerListingRecoveryEnabled
    ),
    sellerListingRecoveryHours: parseNumberList(
      map.get(EMAIL_AUTOMATION_SETTING_KEYS.sellerListingRecoveryHours),
      DEFAULT_SETTINGS.sellerListingRecoveryHours
    ),
    sellerPostListingEnabled: parseBoolean(
      map.get(EMAIL_AUTOMATION_SETTING_KEYS.sellerPostListingEnabled),
      DEFAULT_SETTINGS.sellerPostListingEnabled
    ),
    sellerPostListingDays: parseNumberList(
      map.get(EMAIL_AUTOMATION_SETTING_KEYS.sellerPostListingDays),
      DEFAULT_SETTINGS.sellerPostListingDays
    ),
    sellerRelationshipEnabled: parseBoolean(
      map.get(EMAIL_AUTOMATION_SETTING_KEYS.sellerRelationshipEnabled),
      DEFAULT_SETTINGS.sellerRelationshipEnabled
    ),
    sellerRelationshipDays: parseNumberList(
      map.get(EMAIL_AUTOMATION_SETTING_KEYS.sellerRelationshipDays),
      DEFAULT_SETTINGS.sellerRelationshipDays
    ),
    sellerProfileReminderEnabled: parseBoolean(
      map.get(EMAIL_AUTOMATION_SETTING_KEYS.sellerProfileReminderEnabled),
      DEFAULT_SETTINGS.sellerProfileReminderEnabled
    ),
    sellerProfileReminderIntervalDays: parsePositiveNumber(
      map.get(EMAIL_AUTOMATION_SETTING_KEYS.sellerProfileReminderIntervalDays),
      DEFAULT_SETTINGS.sellerProfileReminderIntervalDays,
      1
    ),
    sellerProfileReminderHour: Math.min(
      23,
      parsePositiveNumber(
        map.get(EMAIL_AUTOMATION_SETTING_KEYS.sellerProfileReminderHour),
        DEFAULT_SETTINGS.sellerProfileReminderHour,
        0
      )
    ),
    buyerAbandonedCartEnabled: parseBoolean(
      map.get(EMAIL_AUTOMATION_SETTING_KEYS.buyerAbandonedCartEnabled),
      DEFAULT_SETTINGS.buyerAbandonedCartEnabled
    ),
    buyerAbandonedCartDelayHours: parsePositiveNumber(
      map.get(EMAIL_AUTOMATION_SETTING_KEYS.buyerAbandonedCartDelayHours),
      DEFAULT_SETTINGS.buyerAbandonedCartDelayHours,
      1
    ),
    blogBroadcastEnabled: parseBoolean(
      map.get(EMAIL_AUTOMATION_SETTING_KEYS.blogBroadcastEnabled),
      DEFAULT_SETTINGS.blogBroadcastEnabled
    ),
    blogBroadcastHour: parsePositiveNumber(
      map.get(EMAIL_AUTOMATION_SETTING_KEYS.blogBroadcastHour),
      DEFAULT_SETTINGS.blogBroadcastHour,
      0
    ),
    blogBroadcastAudience: parseBroadcastAudience(
      map.get(EMAIL_AUTOMATION_SETTING_KEYS.blogBroadcastAudience),
      DEFAULT_SETTINGS.blogBroadcastAudience
    ),
    lifecycleNotificationsEnabled: parseBoolean(
      map.get(EMAIL_AUTOMATION_SETTING_KEYS.lifecycleNotificationsEnabled),
      DEFAULT_SETTINGS.lifecycleNotificationsEnabled
    ),
    frequencyCapHours: parsePositiveNumber(
      map.get(EMAIL_AUTOMATION_SETTING_KEYS.frequencyCapHours),
      DEFAULT_SETTINGS.frequencyCapHours,
      0
    ),
  } satisfies EmailAutomationSettings;
}

export async function upsertEmailAutomationSettings(
  admin: SupabaseClient,
  settings: EmailAutomationSettings
) {
  const rows = [
    {
      key: EMAIL_AUTOMATION_SETTING_KEYS.sellerLifecycleHour,
      value: String(settings.sellerLifecycleHour),
    },
    {
      key: EMAIL_AUTOMATION_SETTING_KEYS.sellerOnboardingEnabled,
      value: String(settings.sellerOnboardingEnabled),
    },
    {
      key: EMAIL_AUTOMATION_SETTING_KEYS.sellerOnboardingDays,
      value: stringifySchedule(settings.sellerOnboardingDays),
    },
    {
      key: EMAIL_AUTOMATION_SETTING_KEYS.sellerListingRecoveryEnabled,
      value: String(settings.sellerListingRecoveryEnabled),
    },
    {
      key: EMAIL_AUTOMATION_SETTING_KEYS.sellerListingRecoveryHours,
      value: stringifySchedule(settings.sellerListingRecoveryHours),
    },
    {
      key: EMAIL_AUTOMATION_SETTING_KEYS.sellerPostListingEnabled,
      value: String(settings.sellerPostListingEnabled),
    },
    {
      key: EMAIL_AUTOMATION_SETTING_KEYS.sellerPostListingDays,
      value: stringifySchedule(settings.sellerPostListingDays),
    },
    {
      key: EMAIL_AUTOMATION_SETTING_KEYS.sellerRelationshipEnabled,
      value: String(settings.sellerRelationshipEnabled),
    },
    {
      key: EMAIL_AUTOMATION_SETTING_KEYS.sellerRelationshipDays,
      value: stringifySchedule(settings.sellerRelationshipDays),
    },
    {
      key: EMAIL_AUTOMATION_SETTING_KEYS.sellerProfileReminderEnabled,
      value: String(settings.sellerProfileReminderEnabled),
    },
    {
      key: EMAIL_AUTOMATION_SETTING_KEYS.sellerProfileReminderIntervalDays,
      value: String(settings.sellerProfileReminderIntervalDays),
    },
    {
      key: EMAIL_AUTOMATION_SETTING_KEYS.sellerProfileReminderHour,
      value: String(settings.sellerProfileReminderHour),
    },
    {
      key: EMAIL_AUTOMATION_SETTING_KEYS.buyerAbandonedCartEnabled,
      value: String(settings.buyerAbandonedCartEnabled),
    },
    {
      key: EMAIL_AUTOMATION_SETTING_KEYS.buyerAbandonedCartDelayHours,
      value: String(settings.buyerAbandonedCartDelayHours),
    },
    {
      key: EMAIL_AUTOMATION_SETTING_KEYS.blogBroadcastEnabled,
      value: String(settings.blogBroadcastEnabled),
    },
    {
      key: EMAIL_AUTOMATION_SETTING_KEYS.blogBroadcastHour,
      value: String(settings.blogBroadcastHour),
    },
    {
      key: EMAIL_AUTOMATION_SETTING_KEYS.blogBroadcastAudience,
      value: settings.blogBroadcastAudience,
    },
    {
      key: EMAIL_AUTOMATION_SETTING_KEYS.lifecycleNotificationsEnabled,
      value: String(settings.lifecycleNotificationsEnabled),
    },
    {
      key: EMAIL_AUTOMATION_SETTING_KEYS.frequencyCapHours,
      value: String(settings.frequencyCapHours),
    },
  ].map((row) => ({
    ...row,
    updated_at: new Date().toISOString(),
  }));

  return admin.from("site_settings").upsert(rows, { onConflict: "key" });
}

export function parseScheduleInput(value: FormDataEntryValue | null, fallback: number[], min = 0) {
  return parseNumberList(typeof value === "string" ? value : "", fallback, min);
}

export function parseBooleanInput(value: FormDataEntryValue | null, fallback: boolean) {
  return parseBoolean(typeof value === "string" ? value : "", fallback);
}

export function parseNumberInput(value: FormDataEntryValue | null, fallback: number, min = 0) {
  return parsePositiveNumber(typeof value === "string" ? value : "", fallback, min);
}

export function getDefaultEmailAutomationSettings() {
  return { ...DEFAULT_SETTINGS };
}
