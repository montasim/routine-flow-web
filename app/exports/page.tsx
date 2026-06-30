import type { Metadata } from "next"

import { ExportsPageClient } from "@/components/app/pages/exports-page"
import { createPageMetadata } from "@/lib/seo"

export const metadata: Metadata = createPageMetadata({
  title: "Exports",
  description: "Export RoutineFlow routine logs and analytics data for offline analysis.",
  path: "/exports",
  noIndex: true,
})

export default function ExportsPage() {
  return <ExportsPageClient />
}
