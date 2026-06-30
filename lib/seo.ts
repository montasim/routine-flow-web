import type { Metadata } from "next"

const fallbackSiteUrl = "http://localhost:3000"

export const siteConfig = {
  name: "RoutineFlow",
  description:
    "RoutineFlow is a behavioral routine tracking workspace for scheduled habits, execution logs, consistency analytics, and routine drift prevention.",
  keywords: [
    "routine tracker",
    "habit tracker",
    "behavior tracking",
    "routine analytics",
    "habit analytics",
    "productivity app",
    "consistency tracker",
    "routine planner",
  ],
  url: getSiteUrl(),
}

export function getSiteUrl() {
  const rawUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.BETTER_AUTH_URL ||
    process.env.URL ||
    process.env.DEPLOY_PRIME_URL ||
    process.env.VERCEL_URL ||
    fallbackSiteUrl

  const withProtocol = rawUrl.startsWith("http://") || rawUrl.startsWith("https://")
    ? rawUrl
    : `https://${rawUrl}`

  try {
    const url = new URL(withProtocol)
    url.pathname = url.pathname.replace(/\/+$/, "")
    return url
  } catch {
    return new URL(fallbackSiteUrl)
  }
}

export function absoluteUrl(path = "/") {
  return new URL(path, siteConfig.url).toString()
}

export function createPageMetadata({
  title,
  description = siteConfig.description,
  path = "/",
  noIndex = false,
}: {
  title: string
  description?: string
  path?: string
  noIndex?: boolean
}): Metadata {
  const pageTitle = title === siteConfig.name ? siteConfig.name : `${title} | ${siteConfig.name}`

  return {
    title,
    description,
    alternates: {
      canonical: path,
    },
    openGraph: {
      title: pageTitle,
      description,
      url: path,
      siteName: siteConfig.name,
      locale: "en_US",
      type: "website",
      images: [
        {
          url: "/opengraph-image",
          width: 1200,
          height: 630,
          alt: `${siteConfig.name} social preview`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description,
      images: [
        {
          url: "/twitter-image",
          alt: `${siteConfig.name} social preview`,
        },
      ],
    },
    robots: noIndex
      ? {
          index: false,
          follow: false,
          googleBot: {
            index: false,
            follow: false,
          },
        }
      : undefined,
  }
}

export const structuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: siteConfig.name,
  description: siteConfig.description,
  applicationCategory: "ProductivityApplication",
  operatingSystem: "Web",
  url: siteConfig.url.toString(),
}
