import "server-only";

import { ADMIN_PATHS } from "@/lib/config/admin";
import { insertNotificationsWithPush } from "@/lib/push/delivery";
import { createAdminClient } from "@/lib/supabase/admin";

function summarizeSupportMessage(body: string) {
  return body.replace(/\s+/g, " ").trim().slice(0, 140);
}

export function buildSupportThreadUserLink(threadId: string) {
  return `/conta?support=open&thread=${encodeURIComponent(threadId)}`;
}

export function buildSupportThreadAdminLink(threadId: string) {
  return `${ADMIN_PATHS.support}/${encodeURIComponent(threadId)}`;
}

async function listAdminSupportRecipients() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("admins")
    .select("user_id")
    .not("user_id", "is", null);

  if (error) {
    throw error;
  }

  return (data ?? [])
    .map((row) => String(row.user_id ?? "").trim())
    .filter(Boolean);
}

export async function notifyAdminsAboutSupportMessage(params: {
  threadId: string;
  senderName: string;
  body: string;
}) {
  const recipients = await listAdminSupportRecipients();
  if (recipients.length === 0) {
    return {
      recipients: 0,
      inserted: 0,
      push: {
        ok: true,
        sent: 0,
        failed: 0,
        browserSent: 0,
        browserFailed: 0,
        nativeSent: 0,
        nativeFailed: 0,
        skipped: true,
      },
    };
  }

  const admin = createAdminClient();
  const title = "Nova mensagem no suporte";
  const body = `${params.senderName} enviou: ${summarizeSupportMessage(params.body)}`;
  const link = buildSupportThreadAdminLink(params.threadId);

  const notificationResult = await insertNotificationsWithPush(
    admin,
    recipients.map((userId) => ({
      user_id: userId,
      title,
      body,
      link,
      type: "support-message",
    }))
  );

  return {
    recipients: recipients.length,
    inserted: notificationResult.inserted,
    push: notificationResult.pushSummary,
  };
}

export async function notifyUserAboutSupportReply(params: {
  threadId: string;
  userId: string;
  body: string;
}) {
  const userId = params.userId.trim();
  if (!userId) {
    return {
      ok: true,
      inserted: 0,
      push: {
        ok: true,
        sent: 0,
        failed: 0,
        browserSent: 0,
        browserFailed: 0,
        nativeSent: 0,
        nativeFailed: 0,
        skipped: true,
      },
    };
  }

  const admin = createAdminClient();
  const title = "Resposta do suporte da GANM OLS";
  const body = `Sua conversa recebeu resposta: ${summarizeSupportMessage(params.body)}`;
  const link = buildSupportThreadUserLink(params.threadId);

  const notificationResult = await insertNotificationsWithPush(admin, {
    user_id: userId,
    title,
    body,
    link,
    type: "support-message",
  });

  return {
    ok: notificationResult.error === null,
    inserted: notificationResult.inserted,
    push: notificationResult.pushSummary,
  };
}
