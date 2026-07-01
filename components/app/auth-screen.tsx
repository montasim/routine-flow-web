"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Check, ChevronLeft, Clock, Globe, Mail, ShieldCheck, ChartColumn } from "lucide-react"
import { toast } from "sonner"
import { useQueryClient } from "@tanstack/react-query"

import { Button } from "@/components/ui/button"

import { Input } from "@/components/ui/input"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp"
import { AppAside, AppMain, Heading2, Paragraph, Text, View } from "@/components/ui/layout"
import { cn } from "@/lib/utils"

import {
  Brand,
  Field,
  api,
  errorMessage,
} from "@/components/app/app-shell"

export function AuthScreen({ initialMode }: { initialMode: "signin" | "signup" }) {
  const router = useRouter()
  const queryClient = useQueryClient()

  const [authStep, setAuthStep] = React.useState<"entry" | "otp">("entry")
  const authMode = initialMode
  const [email, setEmail] = React.useState("")
  const [name, setName] = React.useState("")
  const [code, setCode] = React.useState("")

  const loadWorkspaceAndRedirect = React.useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["routineflow", "workspace"] })
    router.push("/dashboard")
  }, [queryClient, router])

  async function sendOtp() {
    try {
      await api("/api/v1/auth/otp/send", {
        method: "POST",
        body: { email, name: authMode === "signup" ? name : undefined, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone },
      })
      setAuthStep("otp")
      toast.success("OTP sent. In local development, use 123456.")
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  async function verifyOtp() {
    try {
      await api("/api/v1/auth/otp/verify", { method: "POST", body: { email, code } })
      toast.success("Signed in with email OTP.")
      await loadWorkspaceAndRedirect()
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }


  const signup = authMode === "signup"
  const entry = authStep === "entry"
  return (
    <AppMain className="grid min-h-svh lg:grid-cols-2">
      <View className="flex flex-col justify-center bg-[var(--paper-50)] px-4 py-12 sm:px-6 lg:px-20 xl:px-24">
        <View className="motion-reveal mx-auto w-full max-w-sm">
          <View className="mb-8 flex w-full items-center justify-between gap-4">
            <Brand compact />
            <View className="rounded-[var(--radius-pill)] bg-[var(--signal-50)] px-3 py-1 [font-family:var(--font-mono-stack)] text-[var(--text-2xs)] font-semibold uppercase tracking-[0.08em] text-[var(--signal-600)]">
              V1 API
            </View>
          </View>
          {entry ? (
            <View className="pb-8">
              <Heading2 className="text-[clamp(30px,4vw,40px)]">{signup ? "Create your workspace" : "Welcome back"}</Heading2>
              <Paragraph className="mt-3 text-[var(--text-md)] text-[var(--ink-500)]">
                {signup ? "Start measuring scheduled behavior with a clean routine baseline." : "Sign in to review occurrences, logs, and discipline metrics."}
              </Paragraph>
            </View>
          ) : (
            <View className="pb-8">
              <Button variant="ghost" size="sm" className="mb-4 w-fit px-0 hover:bg-transparent" onClick={() => setAuthStep("entry")}>
                <ChevronLeft className="size-4" />
                Back
              </Button>
              <Heading2 className="text-[clamp(28px,4vw,36px)]">Check your email</Heading2>
              <Paragraph className="mt-3 text-[var(--text-md)] text-[var(--ink-500)]">Enter the 6-digit code sent to {email}.</Paragraph>
            </View>
          )}
          
          <View className="grid gap-4">
            {entry ? (
              <>
                <View className="grid gap-3">
                  <Button variant="outline" size="lg" className="w-full justify-center" onClick={() => window.location.assign("/api/v1/auth/social/google/start?client=web")}>
                    <ShieldCheck className="size-4" />
                    Continue with Google
                  </Button>
                  <View className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-[var(--text-xs)] text-[var(--ink-400)]">
                    <View className="h-px bg-[var(--paper-200)]" />
                    <Text>or</Text>
                    <View className="h-px bg-[var(--paper-200)]" />
                  </View>
                </View>
                <Field label="Email" required>
                  <Input className="min-h-[48px]" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="user@example.com" />
                </Field>
                {signup && (
                  <Field label="Name" optional>
                    <Input className="min-h-[48px]" value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" />
                  </Field>
                )}
                <Button variant="primary" size="lg" className="mt-1 w-full justify-center !text-white [&_svg]:text-white" onClick={sendOtp}>
                  <Mail className="size-4" />
                  {signup ? "Create account" : "Continue with email"}
                  <ArrowRight className="size-4" />
                </Button>

                <View className="flex items-center justify-center gap-2 border-t border-[var(--paper-200)] pt-6 pb-2 text-sm">
                  <Text className="text-[var(--ink-500)]">{signup ? "Already have an account?" : "No account yet?"}</Text>
                  <Button variant="ghost" size="sm" onClick={() => router.push(signup ? "/login" : "/sign-up")}>
                    {signup ? "Sign in" : "Create one"}
                  </Button>
                </View>
              </>
            ) : (
              <>
                <Field label="One-time code" required>
                  <InputOTP maxLength={6} value={code} onChange={(value) => setCode(value.replace(/\D/g, ""))} inputMode="numeric" pattern="[0-9]*" containerClassName="w-full justify-between">
                    <InputOTPGroup className="w-full justify-between">
                      {Array.from({ length: 6 }).map((_, index) => (
                        <InputOTPSlot key={index} index={index} className="size-12" />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </Field>
                <View className="flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--paper-100)] px-3 py-2 text-[var(--text-xs)] text-[var(--ink-500)]">
                  <Clock className="size-4 text-[var(--signal-600)]" />
                  Codes expire quickly. Request a new code if this one fails.
                </View>
                <Button variant="primary" size="lg" className="w-full justify-center !text-white [&_svg]:text-white" onClick={verifyOtp}>
                  <Check className="size-4" />
                  Verify code
                </Button>
              </>
            )}
          </View>
        </View>
      </View>
      <AuthPreviewPanel />
    </AppMain>
  )
}

function AuthPreviewPanel() {
  const occurrences = [
    ["Morning gym", "Completed", "+7m", "completed"],
    ["Vitamins", "Pending", "08:15", "pending"],
    ["Language practice", "Due later", "18:00", "later"],
  ] as const

  return (
    <AppAside className="hidden relative bg-[var(--ink-900)] px-12 py-12 text-white lg:flex lg:flex-col lg:justify-center xl:px-24">
      <View className="motion-reveal mx-auto flex w-full max-w-[460px] flex-col justify-between min-h-[600px]">
        <View>
        <View className="mb-8 flex items-center justify-between gap-4">
          <View className="rounded-[var(--radius-pill)] border border-white/12 bg-white/6 px-3 py-1 [font-family:var(--font-mono-stack)] text-[var(--text-2xs)] font-semibold uppercase tracking-[0.08em] text-white/70">
            Live workspace
          </View>
          <View className="flex items-center gap-2 text-[var(--text-xs)] text-white/55">
            <Globe className="size-4" />
            Asia/Dhaka
          </View>
        </View>
        <Heading2 className="max-w-[460px] text-[clamp(34px,4vw,50px)] leading-[0.98] text-white">
          Discipline, measured.
        </Heading2>
        <Paragraph className="mt-6 max-w-[460px] text-[var(--text-md)] leading-[1.6] text-white/68">
          Scheduled occurrences, execution time, and finalized logs stay in one calm operating view.
        </Paragraph>
      </View>

      <View className="mt-10 grid gap-4">
        <View className="motion-card motion-card-inverse rounded-[var(--radius-lg)] border border-white/12 bg-white/[0.045] p-4">
          <View className="flex items-start justify-between gap-4">
            <View>
              <View className="[font-family:var(--font-mono-stack)] text-[var(--text-2xs)] font-semibold uppercase tracking-[0.08em] text-white/45">Today</View>
              <View className="mt-2 [font-family:var(--font-display-stack)] text-[42px] font-bold leading-none">86</View>
            </View>
            <View className="rounded-[var(--radius-md)] bg-[var(--completed-600)]/16 px-2.5 py-1 [font-family:var(--font-mono-stack)] text-[var(--text-xs)] font-semibold text-[#72e2a2]">
              +12%
            </View>
          </View>
          <View className="mt-4 h-2 overflow-hidden rounded-[var(--radius-pill)] bg-white/10">
            <View className="h-full w-[86%] rounded-[var(--radius-pill)] bg-[var(--signal-500)]" />
          </View>
          <View className="mt-3 flex items-center gap-2 text-[var(--text-xs)] text-white/55">
            <ChartColumn className="size-4" />
            Current discipline score
          </View>
        </View>

        <View className="grid gap-4">
          {occurrences.map(([title, status, time, tone]) => (
            <View key={title} className="motion-row flex items-center justify-between gap-4 rounded-[var(--radius-md)] border border-white/10 bg-white/[0.035] px-4 py-3">
              <View className="flex min-w-0 items-center gap-3">
                <View
                  className={cn(
                    "size-2.5 rounded-[var(--radius-pill)]",
                    tone === "completed" && "bg-[var(--completed-600)]",
                    tone === "pending" && "bg-[var(--skipped-600)]",
                    tone === "later" && "bg-[var(--signal-500)]"
                  )}
                />
                <View className="min-w-0">
                  <View className="truncate font-semibold">{title}</View>
                  <View className="text-[var(--text-xs)] text-white/48">{status}</View>
                </View>
              </View>
              <View className="[font-family:var(--font-mono-stack)] text-[var(--text-xs)] font-semibold text-white/65">{time}</View>
            </View>
          ))}
        </View>

        <View className="grid grid-cols-3 gap-3">
          <AuthStat value="7d" label="Window" />
          <AuthStat value="4" label="States" />
          <AuthStat value="V1" label="API" />
        </View>
      </View>
      </View>
    </AppAside>
  )
}

function AuthStat({ value, label }: { value: string; label: string }) {
  return (
    <View className="motion-card motion-card-inverse rounded-[var(--radius-md)] border border-white/10 bg-white/[0.035] p-3">
      <View className="[font-family:var(--font-display-stack)] text-[var(--text-xl)] font-bold leading-none text-white">{value}</View>
      <View className="mt-1 text-[var(--text-xs)] text-white/52">{label}</View>
    </View>
  )
}
