import "server-only";

type BrevoRecipient = {
  email: string;
  name?: string | null;
};

export type BrevoResult = {
  ok: boolean;
  skipped?: boolean;
  status?: number;
  error?: string;
  data?: unknown;
};

type SendBrevoEmailInput = {
  to: BrevoRecipient[];
  subject: string;
  htmlContent: string;
  textContent?: string;
  tags?: string[];
};

type UpsertBrevoContactInput = {
  email: string;
  listIds?: number[];
};

function getBrevoApiKey() {
  return (
    process.env.BREVO_API_KEY?.trim() ??
    process.env.SENDINBLUE_API_KEY?.trim() ??
    ""
  );
}

function getBrevoSender() {
  const email = process.env.BREVO_SENDER_EMAIL?.trim() ?? "";
  const name = process.env.BREVO_SENDER_NAME?.trim() || "GANM OLS";
  return email ? { email, name } : null;
}

function getBrevoReplyTo() {
  const email = process.env.BREVO_REPLY_TO_EMAIL?.trim() ?? "";
  const name = process.env.BREVO_REPLY_TO_NAME?.trim() || "GANM OLS";
  return email ? { email, name } : undefined;
}

function filterRecipients(recipients: BrevoRecipient[]) {
  return recipients
    .map((recipient) => ({
      email: String(recipient.email ?? "").trim().toLowerCase(),
      name: recipient.name?.trim() || undefined,
    }))
    .filter((recipient) => Boolean(recipient.email));
}

function readBrevoError(data: unknown, raw: string, status: number) {
  if (
    data &&
    typeof data === "object" &&
    "message" in data &&
    typeof data.message === "string" &&
    data.message.trim()
  ) {
    return data.message;
  }

  if (raw.trim()) {
    return raw;
  }

  return `Brevo error ${status}`;
}

async function brevoRequest(path: string, payload: Record<string, unknown>) {
  const apiKey = getBrevoApiKey();
  const sender = getBrevoSender();

  if (!apiKey || !sender) {
    return {
      ok: false,
      skipped: true,
      error: "Brevo is not configured",
    } satisfies BrevoResult;
  }

  try {
    const response = await fetch(`https://api.brevo.com/v3${path}`, {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const raw = await response.text();
    let data: unknown = null;
    if (raw) {
      try {
        data = JSON.parse(raw);
      } catch {
        data = raw;
      }
    }

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        error: readBrevoError(data, raw, response.status),
        data,
      } satisfies BrevoResult;
    }

    return {
      ok: true,
      status: response.status,
      data,
    } satisfies BrevoResult;
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Brevo request failed",
    } satisfies BrevoResult;
  }
}

export async function sendBrevoEmail(input: SendBrevoEmailInput) {
  const sender = getBrevoSender();
  const replyTo = getBrevoReplyTo();
  const to = filterRecipients(input.to);

  if (!sender || to.length === 0) {
    return {
      ok: false,
      skipped: true,
      error: "Missing sender or recipients",
    } satisfies BrevoResult;
  }

  const payload: Record<string, unknown> = {
    sender,
    to,
    subject: input.subject,
    htmlContent: input.htmlContent,
  };

  if (input.textContent?.trim()) {
    payload.textContent = input.textContent.trim();
  }
  if (input.tags?.length) {
    payload.tags = input.tags;
  }
  if (replyTo) {
    payload.replyTo = replyTo;
  }

  return brevoRequest("/smtp/email", payload);
}

export async function upsertBrevoContact(input: UpsertBrevoContactInput) {
  const email = String(input.email ?? "").trim().toLowerCase();
  if (!email) {
    return {
      ok: false,
      skipped: true,
      error: "Missing contact email",
    } satisfies BrevoResult;
  }

  const payload: Record<string, unknown> = {
    email,
    updateEnabled: true,
  };

  if (input.listIds?.length) {
    payload.listIds = input.listIds;
  }

  return brevoRequest("/contacts", payload);
}
