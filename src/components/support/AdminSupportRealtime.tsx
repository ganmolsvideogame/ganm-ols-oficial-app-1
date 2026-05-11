"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { RealtimePostgresChangesFilter } from "@supabase/realtime-js";

import { createClient } from "@/lib/supabase/client";

type AdminSupportRealtimeProps = {
  threadId?: string;
};

export default function AdminSupportRealtime({ threadId }: AdminSupportRealtimeProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const setup = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (accessToken) {
        supabase.realtime.setAuth(accessToken);
      }

      const config: RealtimePostgresChangesFilter<"INSERT"> = {
        event: "INSERT",
        schema: "public",
        table: "support_messages",
      };
      if (threadId) {
        config.filter = `thread_id=eq.${threadId}`;
      }

      channel = supabase
        .channel(threadId ? `admin-support-${threadId}` : "admin-support-inbox")
        .on("postgres_changes", config, () => {
          if (!active) return;
          router.refresh();
        })
        .subscribe();
    };

    void setup();

    return () => {
      active = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [router, supabase, threadId]);

  return null;
}
