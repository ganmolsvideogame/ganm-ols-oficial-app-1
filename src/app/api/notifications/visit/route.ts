import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminUserIds } from "@/lib/supabase/admins";
import { insertNotificationsWithPush } from "@/lib/push/delivery";

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

  // Only notify for the seller landing page to keep admin alerts focused.
  if (path !== "/vender/comece") {
    return NextResponse.json({ ok: true });
  }

  try {
    const adminIds = await getAdminUserIds(admin);

    if (adminIds.length > 0) {
      await insertNotificationsWithPush(admin, 
        adminIds.map((adminId) => ({
          user_id: adminId,
          title: "Visita na landing de vendedores",
          body: "Alguem acessou a landing de vendedores.",
          link: path,
          type: "seller_landing_visit",
        }))
      );
    }
  } catch (err) {
    console.warn("Visit notification failed:", err);
  }

  return NextResponse.json({ ok: true });
}
