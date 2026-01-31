import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const admin = createAdminClient();
  let path = "/";

  try {
    const body = (await request.json()) as { path?: string } | null;
    if (body?.path && body.path.startsWith("/")) {
      path = body.path;
    }
  } catch {
    path = "/";
  }

  try {
    const { data: admins } = await admin
      .from("admins")
      .select("user_id")
      .not("user_id", "is", null);
    const adminIds = (admins ?? [])
      .map((row) => row.user_id)
      .filter((id): id is string => Boolean(id));

    if (adminIds.length > 0) {
      await admin.from("notifications").insert(
        adminIds.map((adminId) => ({
          user_id: adminId,
          title: "Nova visita no site",
          body: `Visita registrada em ${path}.`,
          link: path,
          type: "visits",
        }))
      );
    }
  } catch (err) {
    console.warn("Visit notification failed:", err);
  }

  return NextResponse.json({ ok: true });
}

