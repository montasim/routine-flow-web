import type { Metadata } from "next"

import { AuthScreen } from "@/components/app/auth-screen"
import { createPageMetadata } from "@/lib/seo"

export const metadata: Metadata = createPageMetadata({
  title: "Sign in",
  description: "Sign in to RoutineFlow to track scheduled routines, execution logs, and behavior analytics.",
  path: "/login",
})

export default function LoginPage() {
  return <AuthScreen initialMode="signin" />
}
