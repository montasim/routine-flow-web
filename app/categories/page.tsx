import type { Metadata } from "next"

import { CategoriesPageClient } from "@/components/app/pages/categories-page"
import { createPageMetadata } from "@/lib/seo"

export const metadata: Metadata = createPageMetadata({
  title: "Categories",
  description: "Organize routines by category and review category-level consistency in RoutineFlow.",
  path: "/categories",
  noIndex: true,
})

export default function CategoriesPage() {
  return <CategoriesPageClient />
}
