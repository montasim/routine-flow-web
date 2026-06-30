import type { Metadata } from "next"

import { RoutinesPageClient } from "@/components/app/pages/routines-page"
import { createPageMetadata } from "@/lib/seo"

export const metadata: Metadata = createPageMetadata({
  title: "Routines",
  description: "Manage fixed routine schedules, reminders, recurrence rules, and active habits in RoutineFlow.",
  path: "/routines",
  noIndex: true,
})

export default function RoutinesPage() {
  return <RoutinesPageClient />
}
