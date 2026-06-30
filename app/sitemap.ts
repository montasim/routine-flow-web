import type { MetadataRoute } from "next"

import { absoluteUrl } from "@/lib/seo"

const publicRoutes = [
  { path: "/", priority: 1 },
  { path: "/login", priority: 0.8 },
  { path: "/sign-up", priority: 0.7 },
] as const

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()

  return publicRoutes.map((route) => ({
    url: absoluteUrl(route.path),
    lastModified,
    changeFrequency: "weekly",
    priority: route.priority,
  }))
}
