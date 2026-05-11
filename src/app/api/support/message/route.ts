import { NextResponse } from "next/server";

import { notifyAdminsAboutSupportMessage } from "@/lib/support/notifications";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type SupportThreadRow = {
  id: string;
  user_id: string;
  status: string | null;
};

function normalizeBody(value: unknown) {
  return String(value ?? "").replace(/\r\n/g, "\n").trim();
}

async function ensureSupportThread(userId: string, requestedThreadId: string) {
  const admin = createAdminClient();

  if (requestedThreadId) {
    const { data } = await admin
      .from("support_threads")
      .select("id, user_id, status")
      .eq("id", requestedThreadId)
      .eq("user_id", userId)
      .maybeSingle();

    if (data?.id) {
      return (data as SupportThreadRow).id;
    }
  }

  const { data: existing, error: existingError } = await admin
    .from("support_threads")
    .select("id, user_id, status")
    .eq("user_id", userId)
    .eq("status", "open")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existing?.id) {
    return (existing as SupportThreadRow).id;
  }

  const { data: inserted, error: insertError } = await admin
    .from("support_threads")
    .insert({ user_id: userId, status: "open" })
    .select("id, user_id, status")
    .single();

  if (insertError) {
    throw insertError;
  }

  return (inserted as SupportThreadRow).id;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      threadId?: string;
      body?: string;
    };

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { ok: false, message: "Faça login para falar com o suporte." },
        { status: 401 }
      );
    }

    const messageBody = normalizeBody(body.body);
    if (!messageBody) {
      return NextResponse.json(
        { ok: false, message: "Escreva uma mensagem antes de enviar." },
        { status: 400 }
      );
    }

    const threadId = await ensureSupportThread(
      user.id,
      String(body.threadId ?? "").trim()
    );
    const admin = createAdminClient();

    const { data: inserted, error: insertError } = await admin
      .from("support_messages")
      .insert({
        thread_id: threadId,
        sender_user_id: user.id,
        body: messageBody,
      })
      .select("id, thread_id, sender_user_id, body, created_at")
      .single();

    if (insertError) {
      throw insertError;
    }

    await admin
      .from("support_threads")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", threadId);

    const senderName =
      String(user.user_metadata?.display_name ?? "").trim() ||
      String(user.email ?? "").trim() ||
      "Usuário";

    await notifyAdminsAboutSupportMessage({
      threadId,
      senderName,
      body: messageBody,
    });

    return NextResponse.json({
      ok: true,
      threadId,
      row: inserted,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Falha ao enviar mensagem para o suporte.",
      },
      { status: 500 }
    );
  }
}
