import { permanentRedirect } from "next/navigation";

import { localizedPath } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n-server";

export default async function AwesomeMcpClientsPage() {
  const { locale } = await getI18n();
  permanentRedirect(localizedPath("/mcp-clients", locale));
}
