import type { Metadata } from "next"

import { AuthScreen } from "@/components/app/auth-screen"
import { createPageMetadata } from "@/lib/seo"

export const metadata: Metadata = createPageMetadata({
  title: "Create account",
  description: "Create a RoutineFlow workspace to measure routines, prevent drift, and analyze habit consistency.",
  path: "/sign-up",
})

export default function SignUpPage() {
  return <AuthScreen initialMode="signup" />
}
