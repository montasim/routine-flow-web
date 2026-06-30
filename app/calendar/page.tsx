import type { Metadata } from "next"

import { CalendarPageClient } from "@/components/app/pages/calendar-page"
import { createPageMetadata } from "@/lib/seo"

export const metadata: Metadata = createPageMetadata({
  title: "Calendar",
  description: "View scheduled routine occurrences, completed logs, and missed routine days in RoutineFlow.",
  path: "/calendar",
  noIndex: true,
})

export default function CalendarPage() {
  return <CalendarPageClient />
}
