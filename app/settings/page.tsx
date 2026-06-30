import type { Metadata } from "next"

import { SettingsPageClient } from "@/components/app/pages/settings-page"
import { createPageMetadata } from "@/lib/seo"

export const metadata: Metadata = createPageMetadata({
  title: "Settings",
  description: "Manage RoutineFlow profile, timezone, reminder, and notification preferences.",
  path: "/settings",
  noIndex: true,
})

export default function SettingsPage() {
  return <SettingsPageClient />
}
