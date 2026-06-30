import type { Metadata } from "next"

import { SystemPageClient } from "@/components/app/pages/system-page"
import { createPageMetadata } from "@/lib/seo"

export const metadata: Metadata = createPageMetadata({
  title: "System",
  description: "Review RoutineFlow API, scheduled job, and security controls.",
  path: "/system",
  noIndex: true,
})

export default function SystemPage() {
  return <SystemPageClient />
}
