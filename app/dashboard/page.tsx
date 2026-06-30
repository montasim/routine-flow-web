import type { Metadata } from "next"

import { DashboardPageClient } from "@/components/app/pages/dashboard-page"
import { createPageMetadata } from "@/lib/seo"

export const metadata: Metadata = createPageMetadata({
  title: "Dashboard",
  description: "Track today's routine execution state, discipline score, and pending habit occurrences in RoutineFlow.",
  path: "/dashboard",
  noIndex: true,
})

export default function DashboardPage() {
  return <DashboardPageClient />
}
