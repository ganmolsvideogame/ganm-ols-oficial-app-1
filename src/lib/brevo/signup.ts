import "server-only";

import { sendBrevoEmail, upsertBrevoContact } from "@/lib/brevo/client";
import { buildWelcomeEmail } from "@/lib/brevo/templates";

type SignupRole = "buyer" | "seller";

type HandleBrevoSignupInput = {
  email: string;
  displayName: string;
  role: SignupRole;
  origin?: string | null;
};

function parseListId(value: string | undefined) {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    return null;
  }
  const parsed = Number(normalized);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function getListIds(role: SignupRole) {
  const ids = [
    parseListId(process.env.BREVO_ALL_USERS_LIST_ID),
    parseListId(
      role === "seller"
        ? process.env.BREVO_SELLERS_LIST_ID
        : process.env.BREVO_BUYERS_LIST_ID
    ),
  ].filter((value): value is number => value !== null);

  return Array.from(new Set(ids));
}

function buildActionUrl(role: SignupRole, origin?: string | null) {
  const baseUrl =
    origin?.trim() ||
    process.env.APP_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    "http://localhost:3000";
  const path = role === "seller" ? "/vender" : "/conta";
  return new URL(path, baseUrl).toString();
}

export async function handleBrevoSignupAutomation(
  input: HandleBrevoSignupInput
) {
  const email = String(input.email ?? "").trim().toLowerCase();
  if (!email) {
    return {
      contact: {
        ok: false,
        skipped: true,
        error: "Missing signup email",
      },
      email: {
        ok: false,
        skipped: true,
        error: "Missing signup email",
      },
    };
  }

  const actionUrl = buildActionUrl(input.role, input.origin);
  const listIds = getListIds(input.role);
  const contact = await upsertBrevoContact({
    email,
    listIds,
  });
  const template = buildWelcomeEmail({
    displayName: input.displayName,
    role: input.role,
    actionUrl,
  });
  const emailResult = await sendBrevoEmail({
    to: [{ email, name: input.displayName || undefined }],
    subject: template.subject,
    htmlContent: template.html,
    textContent: template.text,
    tags: ["signup", `role:${input.role}`],
  });

  return {
    contact,
    email: emailResult,
  };
}

