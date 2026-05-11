import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { sendBrowserPushNotification } from "@/lib/push/server";

type PushDispatchResult = Awaited<ReturnType<typeof sendBrowserPushNotification>>;

type NotificationInsertRow = {
  user_id: string | null;
  title: string;
  body?: string | null;
  link?: string | null;
  type?: string | null;
  is_read?: boolean | null;
  push_image?: string | null;
  push_tag?: string | null;
  push_lang?: string | null;
  tracking_source?: string | null;
};

type NotificationInsertClient = Pick<SupabaseClient, "from">;

type InsertableNotificationRow = {
  user_id: string | null;
  title: string;
  body: string | null;
  link: string | null;
  type: string | null;
  is_read: boolean;
};

type InsertedNotificationRow = InsertableNotificationRow & {
  id: string;
};

export type NotificationPushSummary = {
  ok: boolean;
  sent: number;
  failed: number;
  browserSent: number;
  browserFailed: number;
  nativeSent: number;
  nativeFailed: number;
  skipped: boolean;
};

function emptyPushSummary(): NotificationPushSummary {
  return {
    ok: true,
    sent: 0,
    failed: 0,
    browserSent: 0,
    browserFailed: 0,
    nativeSent: 0,
    nativeFailed: 0,
    skipped: true,
  };
}

function summarizePushResults(
  pushResults: PromiseSettledResult<PushDispatchResult>[]
): NotificationPushSummary {
  const summary = emptyPushSummary();

  for (const result of pushResults) {
    if (result.status !== "fulfilled") {
      summary.ok = false;
      summary.failed += 1;
      summary.skipped = false;
      continue;
    }

    const browserSkipped = result.value.skipped === true;
    const nativeSkipped = result.value.nativeResult?.skipped === true;

    summary.browserSent += result.value.sent ?? 0;
    summary.browserFailed += result.value.failed ?? 0;
    summary.nativeSent += result.value.nativeResult?.sent ?? 0;
    summary.nativeFailed += result.value.nativeResult?.failed ?? 0;

    if (!browserSkipped || !nativeSkipped) {
      summary.skipped = false;
    }
  }

  summary.sent = summary.browserSent + summary.nativeSent;
  summary.failed = summary.browserFailed + summary.nativeFailed;
  summary.ok = summary.failed === 0;

  return summary;
}

function toInsertableRow(row: NotificationInsertRow): InsertableNotificationRow {
  return {
    user_id: row.user_id,
    title: row.title,
    body: row.body ?? null,
    link: row.link ?? null,
    type: row.type ?? null,
    is_read: row.is_read === true,
  };
}

export async function insertNotificationsWithPush(
  client: NotificationInsertClient,
  rows: NotificationInsertRow | NotificationInsertRow[]
) {
  const notificationRows = Array.isArray(rows) ? rows : [rows];

  if (notificationRows.length === 0) {
    return {
      error: null,
      inserted: 0,
      pushResults: [],
      pushSummary: emptyPushSummary(),
    };
  }

  const preparedRows = notificationRows.map((row) => ({
    insertable: toInsertableRow(row),
    pushImage: String(row.push_image ?? "").trim() || undefined,
    pushTag: String(row.push_tag ?? "").trim() || undefined,
    pushLang: String(row.push_lang ?? "").trim() || "pt-BR",
    trackingSource:
      String(row.tracking_source ?? "").trim() || "notification_push",
  }));

  const { data, error } = await client
    .from("notifications")
    .insert(preparedRows.map((row) => row.insertable))
    .select("id, user_id, title, body, link, type, is_read");

  if (error) {
    return {
      error,
      inserted: 0,
      pushResults: [],
      pushSummary: emptyPushSummary(),
    };
  }

  const pushResults = await Promise.allSettled(
    ((data ?? []) as InsertedNotificationRow[])
      .map((insertedRow, index) => ({ insertedRow, prepared: preparedRows[index] }))
      .filter(
        ({ insertedRow }) =>
          insertedRow.is_read !== true &&
          Boolean(String(insertedRow.user_id ?? "").trim()) &&
          Boolean(String(insertedRow.title ?? "").trim())
      )
      .map(({ insertedRow, prepared }) =>
      sendBrowserPushNotification({
        userIds: [String(insertedRow.user_id ?? "").trim()],
        payload: {
          title: String(insertedRow.title ?? "").trim(),
          body: String(insertedRow.body ?? "").trim(),
          url: String(insertedRow.link ?? "").trim() || "/conta",
          tag:
            prepared?.pushTag ||
            (insertedRow.type
              ? `notification-${String(insertedRow.type).trim()}`
              : undefined),
          lang: prepared?.pushLang || "pt-BR",
          image: prepared?.pushImage,
          notificationId: insertedRow.id,
          notificationType: String(insertedRow.type ?? "").trim() || undefined,
          trackingSource: prepared?.trackingSource || "notification_push",
        },
      })
    )
  );

  const pushSummary = summarizePushResults(pushResults);

  return {
    error: null,
    inserted: notificationRows.length,
    pushResults,
    pushSummary,
  };
}
