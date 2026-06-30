import type { Metadata } from "next"

import { AnalyticsPageClient } from "@/components/app/pages/analytics-page"
import { createPageMetadata } from "@/lib/seo"

export const metadata: Metadata = createPageMetadata({
  title: "Analytics",
  description: "Review routine completion rates, execution trends, and consistency metrics in RoutineFlow.",
  path: "/analytics",
  noIndex: true,
})

export default function AnalyticsPage() {
  return <AnalyticsPageClient />
}
