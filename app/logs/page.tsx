import type { Metadata } from "next"

import { LogsPageClient } from "@/components/app/pages/logs-page"
import { createPageMetadata } from "@/lib/seo"

export const metadata: Metadata = createPageMetadata({
  title: "Logs",
  description: "Review completed, skipped, and missed routine logs in RoutineFlow.",
  path: "/logs",
  noIndex: true,
})

export default function LogsPage() {
  return <LogsPageClient />
}
