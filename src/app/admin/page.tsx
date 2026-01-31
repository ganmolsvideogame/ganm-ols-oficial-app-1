import { redirect } from "next/navigation";

import { ADMIN_PATHS } from "@/lib/config/admin";

export default function Page() {
  redirect(ADMIN_PATHS.login);
}
