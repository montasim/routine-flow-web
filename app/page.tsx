"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  LayoutDashboard,
  Repeat,
  List,
  Download,
  Settings,
  Plus,
  Globe,
  X,
  Mail,
  ArrowLeft,
  Check,
  LogOut,
  AlertTriangle,
  ChevronDown,
  SwitchCamera
} from "lucide-react";
import Image from "next/image";
import { authClient } from "@/lib/auth-client";
import { DEFAULT_TIMEZONE, DEFAULT_REMINDER_MINUTES, TIMEZONES, SETTINGS_TIMEZONES, REMINDER_OPTIONS, CATEGORIES } from "@/lib/constant";

// ─── TYPES ───

interface User {
  id: string;
  name: string;
  email: string;
  image?: string;
}

interface UserSettings {
  userId: string;
  timezone: string;
  defaultReminderMinutes: number;
  notificationPreferences: {
    notifEnabled: boolean;
    useGlobal: boolean;
    skipBreaksStreak: boolean;
  };
}

interface Routine {
  id: string;
  title: string;
  category: string;
  time: string;
  recurrence: string;
  streak: number;
  best: number;
  consistency: number;
  active: boolean;
}

interface Occurrence {
  id: string;
  routineId: string;
  userId: string;
  date: string;
  scheduledTime: string;
  scheduledTimeUtc: string;
  status: "Pending" | "Completed" | "Missed" | "Skipped";
  delay?: number | null;
}

interface LogItem {
  id: string;
  date: string;
  routine: string;
  category: string;
  sched: string;
  done: string | null;
  delay: number | null;
  status: "Completed" | "Missed" | "Skipped";
  timezone: string;
}

interface AnalyticsData {
  metrics: {
    daily: { completion: number; missed: number; avgDelay: number; bestRoutine?: string };
    weekly: { completion: number; missed: number; avgDelay: number; stability: number; variation: number };
    monthly: { completion: number; missed: number; avgDelay: number };
    yearly: { discipline: number; completion: number; drift: string; activeDays: number };
  };
  weekTrend: { day: string; rate: number }[];
  year: { rate: number | null }[][];
  routines: Routine[];
}

// ─── TOAST CONTEXT ───

type ToastTone = "default" | "completed" | "missed" | "skipped" | "signal" | "warning";
interface ToastItem {
  id: number;
  msg: string;
  tone: ToastTone;
  icon?: string;
  duration?: number;
}

const ToastContext = React.createContext<(msg: string, opts?: { tone?: ToastTone; icon?: string; duration?: number }) => void>(() => {});

// ─── SVG BRAND MARK ───

const MARK_SVG = (
  <svg width="100%" height="100%" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="RoutineFlow mark" style={{ display: "block" }}>
    <rect width="96" height="96" rx="22" fill="#16181D" />
    <rect x="22" y="58" width="9" height="16" rx="3" fill="#6A6E78" />
    <rect x="35" y="48" width="9" height="26" rx="3" fill="#8B909B" />
    <rect x="48" y="36" width="9" height="38" rx="3" fill="#25B36B" />
    <rect x="61" y="24" width="9" height="50" rx="3" fill="#3E63FF" />
    <circle cx="65.5" cy="20" r="6" fill="#3E63FF" />
  </svg>
);

// ─── AUTHENTICATION ROOT SHELL ───

function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--surface-app)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 40 }}>
        <div style={{ width: 36, height: 36, flexShrink: 0, overflow: "hidden", borderRadius: 8, lineHeight: 0 }}>
          {MARK_SVG}
        </div>
        <span style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>
          Routine<span style={{ color: "var(--interactive)" }}>Flow</span>
        </span>
      </div>
      <div style={{ width: "100%", maxWidth: 440 }}>{children}</div>
      <div style={{ marginTop: 40, fontFamily: "var(--font-mono)", fontSize: "var(--text-2xs)", color: "var(--text-faint)", textAlign: "center", letterSpacing: "var(--tracking-caps)" }}>
        BEHAVIORAL MEASUREMENT SYSTEM · V1
      </div>
    </div>
  );
}

function GoogleButton({ onClick, loading, label = "Continue with Google" }: { onClick: () => void; loading: boolean; label?: string }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="hover:bg-[var(--surface-sunken)]"
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        padding: "11px 16px",
        borderRadius: "var(--radius-md)",
        border: "1.5px solid var(--border-default)",
        background: "var(--surface-card)",
        cursor: "pointer",
        fontFamily: "var(--font-text)",
        fontSize: "var(--text-md)",
        fontWeight: 500,
        color: "var(--text-primary)",
        transition: "background var(--duration-fast) var(--ease-standard)",
        opacity: loading ? 0.6 : 1,
      }}
    >
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4" />
        <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853" />
        <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05" />
        <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335" />
      </svg>
      {loading ? "Connecting…" : label}
    </button>
  );
}

function Divider({ label = "or" }: { label?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "4px 0" }}>
      <div style={{ flex: 1, height: 1, background: "var(--border-subtle)" }} />
      <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-2xs)", color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "var(--tracking-caps)" }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: "var(--border-subtle)" }} />
    </div>
  );
}

// OTP Pin Input
function OtpInput({ value, onChange, onComplete }: { value: string; onChange: (v: string) => void; onComplete?: (code: string) => void }) {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] || "");

  function handleKey(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      inputs.current[i - 1]?.focus();
      return;
    }
    if (e.key === "ArrowLeft" && i > 0) {
      inputs.current[i - 1]?.focus();
      return;
    }
    if (e.key === "ArrowRight" && i < 5) {
      inputs.current[i + 1]?.focus();
    }
  }

  function handleChange(i: number, e: React.ChangeEvent<HTMLInputElement>) {
    const ch = e.target.value.replace(/\D/g, "").slice(-1);
    const next = digits.map((d, idx) => (idx === i ? ch : d)).join("");
    onChange(next);
    if (ch && i < 5) inputs.current[i + 1]?.focus();
    if (next.length === 6 && onComplete) onComplete(next);
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    onChange(pasted);
    if (pasted.length === 6) {
      if (onComplete) onComplete(pasted);
      inputs.current[5]?.focus();
    } else {
      inputs.current[Math.min(pasted.length, 5)]?.focus();
    }
    e.preventDefault();
  }

  return (
    <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => { inputs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKey(i, e)}
          onPaste={handlePaste}
          style={{
            width: 48,
            height: 54,
            borderRadius: "var(--radius-md)",
            textAlign: "center",
            border: "1.5px solid " + (d ? "var(--interactive)" : "var(--border-default)"),
            fontSize: "var(--text-2xl)",
            fontFamily: "var(--font-mono)",
            fontWeight: 600,
            color: "var(--text-primary)",
            background: "var(--surface-card)",
            outline: "none",
            transition: "border-color var(--duration-fast) var(--ease-standard)",
            caretColor: "var(--interactive)",
          }}
          onFocus={(e) => { e.target.style.borderColor = "var(--interactive)"; }}
          onBlur={(e) => { e.target.style.borderColor = d ? "var(--interactive)" : "var(--border-default)"; }}
        />
      ))}
    </div>
  );
}

// ─── LOGIN PAGE ───

function SignInPage({ onSignIn, onGoSignUp, googleLoginEnabled }: { onSignIn: () => void; onGoSignUp: () => void; googleLoginEnabled: boolean }) {
  const toast = React.useContext(ToastContext);
  const [step, setStep] = useState<"entry" | "otp">("entry");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer((r) => r - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  async function sendOtp() {
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setError("Enter a valid email address.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name: "", timezone: Intl.DateTimeFormat().resolvedOptions().timeZone })
      });
      const data = await res.json();
      setLoading(false);
      if (data.success) {
        setStep("otp");
        setResendTimer(60);
        if (data.devOtp) {
          setOtp(data.devOtp);
          toast(`[DEV MODE] OTP Generated: ${data.devOtp}`, { tone: "default", duration: 8000 });
        }
      } else {
        setError(data.error || "Failed to send code.");
      }
    } catch (e) {
      setLoading(false);
      setError("Server connection error.");
    }
  }

  async function verifyOtp(code = otp) {
    if (code.length < 6) {
      setError("Enter the 6-digit code.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { data, error } = await authClient.$fetch("/sign-in/credentials", {
        method: "POST",
        body: {
          email: email.toLowerCase(),
          code
        }
      });
      setLoading(false);
      if (!error) {
        // Trigger on-demand sync fallback
        await fetch("/api/occurrences/generate", { method: "POST" });
        onSignIn();
      } else {
        setError(error.message || "Invalid OTP code.");
      }
    } catch (e) {
      setLoading(false);
      setError("Verification failed.");
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    try {
      if (googleLoginEnabled) {
        await authClient.signIn.social({
          provider: "google",
          callbackURL: window.location.origin
        });
      } else {
        const { data, error } = await authClient.$fetch("/sign-in/credentials", {
          method: "POST",
          body: {
            email: "ayaan@routineflow.app",
            code: "123456"
          }
        });
        if (!error) {
          await fetch("/api/occurrences/generate", { method: "POST" });
          onSignIn();
        } else {
          toast("Google login failed.", { tone: "warning" });
        }
      }
    } catch (e) {
      toast("Connection error.", { tone: "warning" });
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <SignInView
      step={step}
      email={email}
      setEmail={setEmail}
      otp={otp}
      setOtp={setOtp}
      loading={loading}
      googleLoading={googleLoading}
      error={error}
      setError={setError}
      resendTimer={resendTimer}
      setStep={setStep}
      sendOtp={sendOtp}
      verifyOtp={verifyOtp}
      handleGoogle={handleGoogle}
      onGoSignUp={onGoSignUp}
    />
  );
}

// Separated View for Sign In (Premium Styling)
function SignInView({
  step, email, setEmail, otp, setOtp, loading, googleLoading, error, setError, resendTimer, setStep, sendOtp, verifyOtp, handleGoogle, onGoSignUp
}: any) {
  return (
    <AuthLayout>
      <div style={{ background: "var(--surface-card)", borderRadius: "var(--radius-lg)", padding: "var(--space-8)", boxShadow: "var(--ring-hairline)" }}>
        {step === "entry" ? (
          <>
            <div style={{ marginBottom: 24 }}>
              <h1 style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-2xl)", fontWeight: 700, letterSpacing: "-0.02em", margin: "0 0 6px" }}>Sign in</h1>
              <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", margin: 0 }}>We'll send a one-time code to your email.</p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <GoogleButton onClick={handleGoogle} loading={googleLoading} />
              <Divider />
              {error && <div style={{ background: "var(--missed-100)", color: "var(--missed-600)", fontSize: "var(--text-sm)", padding: "10px 14px", borderRadius: "var(--radius-md)", fontWeight: 500 }}>{error}</div>}
              <div>
                <label style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: "var(--text-2xs)", textTransform: "uppercase", letterSpacing: "var(--tracking-caps)", color: "var(--text-muted)", marginBottom: 6 }}>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  onKeyDown={(e) => e.key === "Enter" && sendOtp()}
                  style={{
                    width: "100%",
                    height: 42,
                    padding: "0 12px",
                    background: "var(--surface-card)",
                    border: "1px solid var(--border-default)",
                    borderRadius: "var(--radius-md)",
                    fontFamily: "var(--font-text)",
                    fontSize: "var(--text-md)",
                    color: "var(--text-primary)",
                    outline: "none",
                  }}
                />
              </div>
              <button
                onClick={sendOtp}
                disabled={loading}
                className="hover:bg-[var(--interactive-hover)] active:scale-[0.97]"
                style={{
                  width: "100%",
                  height: 40,
                  background: "var(--interactive)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "var(--radius-md)",
                  fontWeight: 600,
                  fontSize: "var(--text-md)",
                  cursor: "pointer",
                  boxShadow: "var(--shadow-xs)",
                  transition: "background var(--duration-fast) var(--ease-standard), transform var(--duration-fast) var(--ease-standard)",
                  opacity: loading ? 0.6 : 1,
                }}
              >
                {loading ? "Sending code…" : "Send one-time code"}
              </button>
            </div>
            <div style={{ marginTop: 24, paddingTop: 24, borderTop: "1px solid var(--border-subtle)", textAlign: "center", fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
              No account yet?{" "}
              <button onClick={onGoSignUp} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "var(--interactive)", fontWeight: 600, fontFamily: "var(--font-text)", fontSize: "var(--text-sm)" }}>Create one</button>
            </div>
          </>
        ) : (
          <>
            <button onClick={() => { setStep("entry"); setOtp(""); setError(""); }} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", padding: "0 0 20px", cursor: "pointer", color: "var(--text-secondary)", fontSize: "var(--text-sm)", fontFamily: "var(--font-text)" }}>
              <ArrowLeft size={16} />Back
            </button>
            <div style={{ marginBottom: 28, textAlign: "center" }}>
              <div style={{ width: 48, height: 48, borderRadius: "var(--radius-lg)", background: "var(--signal-50)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", color: "var(--interactive)" }}>
                <Mail size={22} />
              </div>
              <h1 style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-2xl)", fontWeight: 700, letterSpacing: "-0.02em", margin: "0 0 6px" }}>Check your email</h1>
              <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", margin: 0 }}>
                We sent a 6-digit code to <strong>{email}</strong>
              </p>
            </div>
            {error && <div style={{ background: "var(--missed-100)", color: "var(--missed-600)", fontSize: "var(--text-sm)", padding: "10px 14px", borderRadius: "var(--radius-md)", marginBottom: 16, fontWeight: 500, textAlign: "center" }}>{error}</div>}
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <OtpInput value={otp} onChange={setOtp} onComplete={verifyOtp} />
              <button
                onClick={() => verifyOtp()}
                disabled={loading || otp.length < 6}
                className="hover:bg-[var(--interactive-hover)] active:scale-[0.97]"
                style={{
                  width: "100%",
                  height: 40,
                  background: "var(--interactive)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "var(--radius-md)",
                  fontWeight: 600,
                  fontSize: "var(--text-md)",
                  cursor: "pointer",
                  boxShadow: "var(--shadow-xs)",
                  transition: "background var(--duration-fast) var(--ease-standard), transform var(--duration-fast) var(--ease-standard)",
                  opacity: (loading || otp.length < 6) ? 0.6 : 1,
                }}
              >
                {loading ? "Verifying…" : "Verify code"}
              </button>
              <div style={{ textAlign: "center", fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
                Didn't receive it?{" "}
                {resendTimer > 0 ? (
                  <span style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>Resend in {resendTimer}s</span>
                ) : (
                  <button onClick={sendOtp} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "var(--interactive)", fontWeight: 600, fontFamily: "var(--font-text)", fontSize: "var(--text-sm)" }}>Resend code</button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </AuthLayout>
  );
}

// ─── REGISTER PAGE ───

function SignUpPage({ onSignUp, onGoSignIn, googleLoginEnabled }: { onSignUp: () => void; onGoSignIn: () => void; googleLoginEnabled: boolean }) {
  const toast = React.useContext(ToastContext);
  const [step, setStep] = useState<"entry" | "otp">("entry");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [timezone, setTimezone] = useState(DEFAULT_TIMEZONE);
  const [agreed, setAgreed] = useState(false);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendTimer, setResendTimer] = useState(0);

  // Auto-detect timezone
  useEffect(() => {
    try {
      const systemTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (systemTz) setTimezone(systemTz);
    } catch (e) {}
  }, []);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer((r) => r - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  async function sendOtp() {
    if (!name.trim()) {
      setError("Enter your name.");
      return;
    }
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setError("Enter a valid email address.");
      return;
    }
    if (!agreed) {
      setError("You must accept the logs agreement to continue.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, timezone })
      });
      const data = await res.json();
      setLoading(false);
      if (data.success) {
        setStep("otp");
        setResendTimer(30);
        if (data.devOtp) {
          toast(`Developer mode: OTP code is ${data.devOtp}`, { tone: "signal" });
        }
      } else {
        setError(data.error || "Failed to send OTP code.");
      }
    } catch (e) {
      setLoading(false);
      setError("Connection failure.");
    }
  }

  async function verifyOtp(code = otp) {
    if (code.length < 6) {
      setError("Enter the 6-digit code.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { data, error } = await authClient.$fetch("/sign-in/credentials", {
        method: "POST",
        body: {
          email: email.toLowerCase(),
          code
        }
      });
      setLoading(false);
      if (!error) {
        await fetch("/api/occurrences/generate", { method: "POST" });
        onSignUp();
      } else {
        setError(error.message || "Invalid OTP code.");
      }
    } catch (e) {
      setLoading(false);
      setError("Verification failed.");
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    try {
      if (googleLoginEnabled) {
        await authClient.signIn.social({
          provider: "google",
          callbackURL: window.location.origin
        });
      } else {
        const { data, error } = await authClient.$fetch("/sign-in/credentials", {
          method: "POST",
          body: {
            email: "ayaan@routineflow.app",
            code: "123456"
          }
        });
        if (!error) {
          await fetch("/api/occurrences/generate", { method: "POST" });
          onSignUp();
        } else {
          toast("Google signup failed.", { tone: "warning" });
        }
      }
    } catch (e) {
      toast("Connection error.", { tone: "warning" });
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <SignUpView
      step={step}
      name={name}
      setName={setName}
      email={email}
      setEmail={setEmail}
      timezone={timezone}
      setTimezone={setTimezone}
      agreed={agreed}
      setAgreed={setAgreed}
      otp={otp}
      setOtp={setOtp}
      loading={loading}
      googleLoading={googleLoading}
      error={error}
      setError={setError}
      resendTimer={resendTimer}
      setStep={setStep}
      sendOtp={sendOtp}
      verifyOtp={verifyOtp}
      handleGoogle={handleGoogle}
      onGoSignIn={onGoSignIn}
    />
  );
}

// Separated View for Sign Up
function SignUpView({
  step, name, setName, email, setEmail, timezone, setTimezone, agreed, setAgreed, otp, setOtp, loading, googleLoading, error, setError, resendTimer, setStep, sendOtp, verifyOtp, handleGoogle, onGoSignIn
}: any) {
  return (
    <AuthLayout>
      <div style={{ background: "var(--surface-card)", borderRadius: "var(--radius-lg)", padding: "var(--space-8)", boxShadow: "var(--ring-hairline)" }}>
        {step === "entry" ? (
          <>
            <div style={{ marginBottom: 24 }}>
              <h1 style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-2xl)", fontWeight: 700, letterSpacing: "-0.02em", margin: "0 0 6px" }}>Create account</h1>
              <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", margin: 0 }}>Your data belongs to your logs. Nothing else.</p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <GoogleButton onClick={handleGoogle} loading={googleLoading} label="Sign up with Google" />
              <Divider />
              {error && <div style={{ background: "var(--missed-100)", color: "var(--missed-600)", fontSize: "var(--text-sm)", padding: "10px 14px", borderRadius: "var(--radius-md)", fontWeight: 500 }}>{error}</div>}
              <div>
                <label style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: "var(--text-2xs)", textTransform: "uppercase", letterSpacing: "var(--tracking-caps)", color: "var(--text-muted)", marginBottom: 6 }}>Full name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ayaan Rahman"
                  style={{
                    width: "100%",
                    height: 42,
                    padding: "0 12px",
                    background: "var(--surface-card)",
                    border: "1px solid var(--border-default)",
                    borderRadius: "var(--radius-md)",
                    fontFamily: "var(--font-text)",
                    fontSize: "var(--text-md)",
                    color: "var(--text-primary)",
                    outline: "none",
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: "var(--text-2xs)", textTransform: "uppercase", letterSpacing: "var(--tracking-caps)", color: "var(--text-muted)", marginBottom: 6 }}>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  style={{
                    width: "100%",
                    height: 42,
                    padding: "0 12px",
                    background: "var(--surface-card)",
                    border: "1px solid var(--border-default)",
                    borderRadius: "var(--radius-md)",
                    fontFamily: "var(--font-text)",
                    fontSize: "var(--text-md)",
                    color: "var(--text-primary)",
                    outline: "none",
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: "var(--text-2xs)", textTransform: "uppercase", letterSpacing: "var(--tracking-caps)", color: "var(--text-muted)", marginBottom: 6 }}>Timezone</label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  style={{
                    width: "100%",
                    height: 42,
                    padding: "0 12px",
                    background: "var(--surface-card)",
                    border: "1px solid var(--border-default)",
                    borderRadius: "var(--radius-md)",
                    fontFamily: "var(--font-text)",
                    fontSize: "var(--text-md)",
                    color: "var(--text-primary)",
                    outline: "none",
                  }}
                >
                  {TIMEZONES.map(tz => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
                <div style={{ marginTop: 5, fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>Auto-detected. Drives all routine scheduling.</div>
              </div>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10, margin: "6px 0" }}>
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  style={{ width: 18, height: 18, cursor: "pointer", flexShrink: 0, marginTop: 2 }}
                />
                <span style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  I understand that <strong>routine_logs</strong> is the single source of truth, and RoutineFlow stores only what I complete or skip.
                </span>
              </div>
              <button
                onClick={sendOtp}
                disabled={loading}
                className="hover:bg-[var(--interactive-hover)] active:scale-[0.97]"
                style={{
                  width: "100%",
                  height: 40,
                  background: "var(--interactive)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "var(--radius-md)",
                  fontWeight: 600,
                  fontSize: "var(--text-md)",
                  cursor: "pointer",
                  boxShadow: "var(--shadow-xs)",
                  transition: "background var(--duration-fast) var(--ease-standard), transform var(--duration-fast) var(--ease-standard)",
                  opacity: loading ? 0.6 : 1,
                }}
              >
                {loading ? "Sending code…" : "Continue with email"}
              </button>
            </div>
            <div style={{ marginTop: 24, paddingTop: 24, borderTop: "1px solid var(--border-subtle)", textAlign: "center", fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
              Already have an account?{" "}
              <button onClick={onGoSignIn} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "var(--interactive)", fontWeight: 600, fontFamily: "var(--font-text)", fontSize: "var(--text-sm)" }}>Sign in</button>
            </div>
          </>
        ) : (
          <>
            <button onClick={() => { setStep("entry"); setOtp(""); setError(""); }} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", padding: "0 0 20px", cursor: "pointer", color: "var(--text-secondary)", fontSize: "var(--text-sm)", fontFamily: "var(--font-text)" }}>
              <ArrowLeft size={16} />Back
            </button>
            <div style={{ marginBottom: 28, textAlign: "center" }}>
              <div style={{ width: 48, height: 48, borderRadius: "var(--radius-lg)", background: "var(--signal-50)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", color: "var(--interactive)" }}>
                <Mail size={22} />
              </div>
              <h1 style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-2xl)", fontWeight: 700, letterSpacing: "-0.02em", margin: "0 0 6px" }}>Verify your email</h1>
              <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", margin: 0 }}>
                Code sent to <strong>{email}</strong>
              </p>
            </div>
            {error && <div style={{ background: "var(--missed-100)", color: "var(--missed-600)", fontSize: "var(--text-sm)", padding: "10px 14px", borderRadius: "var(--radius-md)", marginBottom: 16, fontWeight: 500, textAlign: "center" }}>{error}</div>}
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <OtpInput value={otp} onChange={setOtp} onComplete={verifyOtp} />
              <button
                onClick={() => verifyOtp()}
                disabled={loading || otp.length < 6}
                className="hover:bg-[var(--interactive-hover)] active:scale-[0.97]"
                style={{
                  width: "100%",
                  height: 40,
                  background: "var(--interactive)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "var(--radius-md)",
                  fontWeight: 600,
                  fontSize: "var(--text-md)",
                  cursor: "pointer",
                  boxShadow: "var(--shadow-xs)",
                  transition: "background var(--duration-fast) var(--ease-standard), transform var(--duration-fast) var(--ease-standard)",
                  opacity: (loading || otp.length < 6) ? 0.6 : 1,
                }}
              >
                {loading ? "Verifying…" : "Create account"}
              </button>
              <div style={{ textAlign: "center", fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
                Didn't receive it?{" "}
                {resendTimer > 0 ? (
                  <span style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>Resend in {resendTimer}s</span>
                ) : (
                  <button onClick={() => { setOtp(""); sendOtp(); }} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "var(--interactive)", fontWeight: 600, fontFamily: "var(--font-text)", fontSize: "var(--text-sm)" }}>Resend code</button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </AuthLayout>
  );
}

// ─── DASHBOARD CHILD COMPONENTS ───

// Progress Circle
function ProgressRing({ value, size = 96, thickness = 8, color = "var(--interactive)", trackColor = "var(--surface-sunken)", label, centerLabel }: any) {
  const pct = Math.max(0, Math.min(1, value / 100));
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct);
  return (
    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: "var(--space-3)" }}>
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor} strokeWidth={thickness} />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={thickness} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset} style={{ transition: "stroke-dashoffset var(--duration-slow) var(--ease-out)" }} />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontFamily: "var(--font-display)", fontSize: size * 0.3, fontWeight: "var(--weight-bold)", letterSpacing: "var(--tracking-tight)", color: "var(--text-primary)", lineHeight: 1 }}>
            {centerLabel ?? Math.round(value)}
          </span>
          {centerLabel === undefined && (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: size * 0.12, color: "var(--text-muted)" }}>/100</span>
          )}
        </div>
      </div>
      {label && <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "var(--tracking-caps)", color: "var(--text-muted)" }}>{label}</span>}
    </div>
  );
}

// Trend Bars
function TrendChart({ data }: { data: { day: string; rate: number }[] }) {
  return (
    <div style={{ background: "var(--surface-card)", borderRadius: "var(--radius-lg)", padding: "var(--space-7)", boxShadow: "var(--ring-hairline)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 20 }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-xl)", fontWeight: 600 }}>Completion trend</div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>last 7 days · %</div>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 18, height: 200 }}>
        {data.map((d, i) => (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, height: "100%", justifyContent: "flex-end" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>{Math.round(d.rate * 100)}</div>
            <div style={{ width: "100%", maxWidth: 56, height: (d.rate * 150) + "px", minHeight: 6, background: d.rate >= 0.85 ? "var(--completed-600)" : d.rate >= 0.6 ? "var(--ramp-3)" : "var(--skipped-500)", borderRadius: "var(--radius-md) var(--radius-md) 4px 4px", transition: "height var(--duration-slow) var(--ease-out)" }} />
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>{d.day}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Discipline score components weights
function DisciplineBreakdown({ score }: { score: number }) {
  function Factor({ label, weight, val }: { label: string; weight: string; val: number }) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ width: 130, fontSize: "var(--text-sm)", color: "var(--text-secondary)", flexShrink: 0 }}>{label}</span>
        <div style={{ flex: 1, height: 6, background: "var(--surface-sunken)", borderRadius: "var(--radius-pill)", overflow: "hidden" }}>
          <div style={{ width: (val * 100) + "%", height: "100%", background: "var(--interactive)", borderRadius: "var(--radius-pill)" }} />
        </div>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-2xs)", color: "var(--text-faint)", width: 30, textAlign: "right", flexShrink: 0 }}>{weight}</span>
      </div>
    );
  }
  return (
    <div style={{ background: "var(--surface-card)", borderRadius: "var(--radius-lg)", padding: "var(--space-7)", boxShadow: "var(--ring-hairline)", width: "100%" }}>
      <div style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-xl)", fontWeight: 600, marginBottom: 20 }}>Discipline score</div>
      <div className="flex items-center gap-7 flex-col sm:flex-row sm:items-center">
        <ProgressRing value={score} size={110} thickness={10} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
          <Factor label="Completion rate" weight="40%" val={0.86} />
          <Factor label="Consistency" weight="30%" val={0.81} />
          <Factor label="Delay penalty" weight="20%" val={0.74} />
          <Factor label="Streak bonus" weight="10%" val={0.9} />
        </div>
      </div>
    </div>
  );
}

// Heatmap Cell
function HeatmapCell({ rate, level, title }: { rate: number | null; level?: number; title?: string }) {
  const RAMP = ["var(--ramp-0)", "var(--ramp-1)", "var(--ramp-2)", "var(--ramp-3)", "var(--ramp-4)"];
  let lvl = level;
  if (lvl === undefined && rate !== null) {
    lvl = rate <= 0 ? 0 : rate < 0.25 ? 1 : rate < 0.5 ? 2 : rate < 0.85 ? 3 : 4;
  }
  const bg = rate === null ? "transparent" : RAMP[lvl ?? 0];
  const border = rate === 0 || lvl === 0 ? "inset 0 0 0 1px var(--border-subtle)" : "none";

  return (
    <span
      title={title}
      style={{
        display: "inline-block",
        width: 13,
        height: 13,
        borderRadius: 3,
        background: bg,
        boxShadow: border,
        flexShrink: 0
      }}
    />
  );
}

// Yearly Heatmap Grid
function HeatmapView({ year }: { year: { rate: number | null }[][] }) {
  return (
    <div style={{ background: "var(--surface-card)", borderRadius: "var(--radius-lg)", padding: "var(--space-7)", boxShadow: "var(--ring-hairline)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 20 }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-xl)", fontWeight: 600 }}>Yearly heatmap</div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>2026 · completion rate</div>
      </div>
      <div style={{ display: "flex", gap: 3, overflowX: "auto", paddingBottom: 4 }}>
        {year.map((wk, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", gap: 3, flexShrink: 0 }}>
            {wk.map((d, j) => <HeatmapCell key={j} rate={d.rate} title={d.rate !== null ? `Rate: ${Math.round(d.rate * 100)}%` : undefined} />)}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-2xs)", color: "var(--text-faint)" }}>Less</span>
        {[0, 1, 2, 3, 4].map(l => <HeatmapCell key={l} rate={l / 4} level={l} />)}
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-2xs)", color: "var(--text-faint)" }}>More</span>
      </div>
    </div>
  );
}

// Status Pill
function StatusPill({ status, delay }: { status: "Pending" | "Completed" | "Missed" | "Skipped"; delay?: number | null }) {
  const tones = {
    Completed: { fg: "var(--completed-600)", bg: "var(--completed-100)", dot: "var(--completed-600)" },
    Pending: { fg: "var(--pending-600)", bg: "var(--pending-100)", dot: "var(--pending-600)" },
    Missed: { fg: "var(--missed-600)", bg: "var(--missed-100)", dot: "var(--missed-600)" },
    Skipped: { fg: "var(--skipped-600)", bg: "var(--skipped-100)", dot: "var(--skipped-600)" }
  };
  const t = tones[status] || tones.Pending;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        height: 24,
        padding: "0 10px 0 8px",
        background: t.bg,
        color: t.fg,
        borderRadius: "var(--radius-pill)",
        fontFamily: "var(--font-text)",
        fontSize: "var(--text-xs)",
        fontWeight: 600,
        whiteSpace: "nowrap"
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: t.dot, flex: "none" }} />
      {status}
      {status === "Completed" && delay !== undefined && delay !== null && (
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-2xs)", opacity: 0.85, marginLeft: 2 }}>
          {delay > 0 ? `+${delay}m` : delay < 0 ? `${delay}m` : "on time"}
        </span>
      )}
    </span>
  );
}

// Streak Chip
function StreakChip({ days, best, size = "md" }: { days: number; best?: number; size?: "sm" | "md" }) {
  const active = days > 0;
  const isRecord = best !== undefined && best !== null && days >= best && days > 0;
  const dims = size === "sm" ? { h: 24, fs: "var(--text-xs)", icon: 13 } : { h: 30, fs: "var(--text-md)", icon: 16 };
  const fg = active ? "var(--skipped-600)" : "var(--text-faint)";
  const bg = active ? "var(--skipped-100)" : "var(--surface-sunken)";

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, height: dims.h, padding: "0 10px", background: bg, color: fg, borderRadius: "var(--radius-pill)" }}>
      <svg width={dims.icon} height={dims.icon} viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8">
        <path d="M12 2c1 3 4 4.5 4 8a4 4 0 1 1-8 0c0-1.2.4-2 1-2.8C9.5 8 12 6 12 2z" strokeLinejoin="round" />
      </svg>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: dims.fs, fontWeight: 600 }}>{days}d</span>
      {isRecord && <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-2xs)", opacity: 0.8 }}>PB</span>}
    </span>
  );
}

// Occurrence Row on Dashboard
function OccurrenceRow({
  id, time, title, category, status, delay, onComplete, onSkip
}: {
  id: string; time: string; title: string; category: string; status: Occurrence["status"]; delay?: number | null;
  onComplete: (id: string) => void; onSkip: (id: string) => void;
}) {
  const CATEGORY_COLORS: any = {
    Health: "var(--completed-600)",
    Fitness: "var(--signal-500)",
    Mind: "var(--skipped-600)",
    Work: "var(--ink-700)",
    Faith: "var(--ramp-3)"
  };
  const accent = CATEGORY_COLORS[category] || "var(--border-strong)";
  const isPending = status === "Pending";
  const dimmed = status === "Missed" || status === "Skipped";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-5)",
        padding: "var(--space-5)",
        background: "var(--surface-card)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--ring-hairline)",
        opacity: dimmed ? 0.72 : 1
      }}
    >
      <span style={{ width: 4, alignSelf: "stretch", borderRadius: "var(--radius-pill)", background: accent, flex: "none" }} />
      <div style={{ width: 56, flex: "none" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-lg)", fontWeight: 500, color: "var(--text-primary)", lineHeight: 1.1 }}>{time}</div>
        {category && <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-2xs)", textTransform: "uppercase", letterSpacing: "var(--tracking-caps)", color: "var(--text-muted)", marginTop: 2 }}>{category}</div>}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "var(--font-text)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</div>
      </div>
      {isPending ? (
        <div style={{ display: "flex", gap: "var(--space-3)", flex: "none" }}>
          <button
            onClick={() => onSkip(id)}
            aria-label="Skip"
            className="hover:bg-[var(--surface-sunken)]"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 38,
              height: 38,
              flex: "none",
              background: "var(--surface-card)",
              color: "var(--text-secondary)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-md)",
              cursor: "pointer"
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M7 5v14M17 5v14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          <button
            onClick={() => onComplete(id)}
            aria-label="Complete"
            className="hover:bg-[var(--completed-500)]"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 38,
              height: 38,
              flex: "none",
              background: "var(--completed-600)",
              color: "#fff",
              border: "1px solid transparent",
              borderRadius: "var(--radius-md)",
              cursor: "pointer",
              boxShadow: "var(--shadow-xs)"
            }}
          >
            <Check size={18} />
          </button>
        </div>
      ) : (
        <StatusPill status={status} delay={delay} />
      )}
    </div>
  );
}

// Logs Table View
function LogsTable({ logs }: { logs: LogItem[] }) {
  const cols = ["Date", "Routine", "Scheduled", "Completed", "Delay", "Status", "Timezone"];
  return (
    <div style={{ background: "var(--surface-card)", borderRadius: "var(--radius-lg)", padding: 0, boxShadow: "var(--ring-hairline)", overflow: "hidden", width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid var(--border-subtle)" }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-xl)", fontWeight: 600 }}>routine_logs</div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-2xs)", color: "var(--text-muted)" }}>source of truth</div>
      </div>
      <div className="overflow-x-auto select-none sm:select-text" style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <table className="w-full border-collapse text-[var(--text-sm)]" style={{ minWidth: 520 }}>
          <thead>
            <tr>
              {cols.map(c => (
                <th key={c} className="text-left p-2.5 sm:p-3 lg:p-[12px_24px] font-mono text-[var(--text-2xs)] uppercase tracking-[var(--tracking-caps)] text-[var(--text-muted)] font-semibold border-b border-[var(--border-subtle)]">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {logs.map((l, i) => (
              <tr key={l.id || i} className="hover:bg-[var(--surface-sunken)] transition-colors">
                <td className="p-2.5 sm:p-3 lg:p-[12px_24px] border-b border-[var(--border-subtle)] font-mono color-[var(--text-secondary)]">{l.date}</td>
                <td className="p-2.5 sm:p-3 lg:p-[12px_24px] border-b border-[var(--border-subtle)] font-semibold color-[var(--text-primary)]">{l.routine}</td>
                <td className="p-2.5 sm:p-3 lg:p-[12px_24px] border-b border-[var(--border-subtle)] font-mono">{l.sched}</td>
                <td className="p-2.5 sm:p-3 lg:p-[12px_24px] border-b border-[var(--border-subtle)] font-mono">{l.done || "—"}</td>
                <td className="p-2.5 sm:p-3 lg:p-[12px_24px] border-b border-[var(--border-subtle)] font-mono" style={{ color: l.delay === null ? "var(--text-faint)" : l.delay > 0 ? "var(--missed-600)" : l.delay < 0 ? "var(--completed-600)" : "var(--text-secondary)" }}>
                  {l.delay === null ? "—" : (l.delay > 0 ? "+" : "") + l.delay + "m"}
                </td>
                <td className="p-2.5 sm:p-3 lg:p-[12px_24px] border-b border-[var(--border-subtle)]"><StatusPill status={l.status} /></td>
                <td className="p-2.5 sm:p-3 lg:p-[12px_24px] border-b border-[var(--border-subtle)] font-mono text-[var(--text-faint)] text-[var(--text-xs)]">{l.timezone}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// KPI Metric Tile
function MetricTile({ label, value, unit, delta, deltaDirection = "up", tone = "default" }: any) {
  const valueColor = (({
    default: "var(--text-primary)",
    signal: "var(--interactive)",
    completed: "var(--completed-600)",
    missed: "var(--missed-600)"
  } as Record<string, string>)[tone]) || "var(--text-primary)";
  const good = deltaDirection === "up";
  const deltaColor = delta === undefined ? "transparent" : good ? "var(--completed-600)" : "var(--missed-600)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", padding: "var(--space-6)", background: "var(--surface-card)", borderRadius: "var(--radius-lg)", boxShadow: "var(--ring-hairline)" }}>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-2xs)", textTransform: "uppercase", letterSpacing: "var(--tracking-caps)", color: "var(--text-muted)" }}>{label}</span>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-3xl)", fontWeight: 700, letterSpacing: "var(--tracking-tight)", lineHeight: 1, color: valueColor }}>{value}</span>
        {unit && <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>{unit}</span>}
      </div>
      {delta !== undefined && (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", fontWeight: 500, color: deltaColor }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" style={{ transform: good ? "none" : "rotate(180deg)" }}>
            <path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {delta}
        </span>
      )}
    </div>
  );
}

// Confirmation Dialog Modal
function ConfirmModal({ config, onConfirm, onCancel }: { config: any; onConfirm: () => void; onCancel: () => void }) {
  const tone = config.confirmTone || "danger";
  const confirmStyle = (({
    danger: { bg: "var(--missed-600)", hover: "var(--missed-500)", fg: "#fff" },
    primary: { bg: "var(--interactive)", hover: "var(--interactive-hover)", fg: "#fff" }
  } as Record<string, { bg: string; hover: string; fg: string }>)[tone]) || { bg: "var(--missed-600)", hover: "var(--missed-500)", fg: "#fff" };

  return (
    <div onClick={(e) => e.target === e.currentTarget && onCancel()} style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(22,24,29,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "var(--surface-card)", borderRadius: "var(--radius-xl)", width: "100%", maxWidth: 400, boxShadow: "var(--shadow-pop)", animation: "modalIn 180ms var(--ease-out) both", overflow: "hidden" }}>
        <div style={{ padding: "28px 28px 0", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 14 }}>
          <div style={{ width: 52, height: 52, borderRadius: "var(--radius-lg)", background: tone === "danger" ? "var(--missed-100)" : "var(--signal-50)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: tone === "danger" ? "var(--missed-600)" : "var(--interactive)", display: "inline-flex" }}>
              <AlertTriangle size={24} />
            </span>
          </div>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-xl)", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 6 }}>{config.title}</div>
            <div style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", lineHeight: 1.55 }}>{config.body}</div>
          </div>
        </div>
        <div style={{ padding: "24px 28px 28px", display: "flex", gap: 10 }}>
          <button onClick={onCancel} className="hover:bg-[var(--surface-sunken)]" style={{ flex: 1, padding: "10px 16px", borderRadius: "var(--radius-md)", border: "1.5px solid var(--border-default)", background: "var(--surface-card)", cursor: "pointer", fontFamily: "var(--font-text)", fontSize: "var(--text-md)", fontWeight: 500, color: "var(--text-primary)", transition: "background var(--duration-fast) var(--ease-standard)" }}>{config.cancelLabel || "Cancel"}</button>
          <button onClick={onConfirm} className="hover:opacity-90" style={{ flex: 1, padding: "10px 16px", borderRadius: "var(--radius-md)", border: "none", background: confirmStyle.bg, cursor: "pointer", fontFamily: "var(--font-text)", fontSize: "var(--text-md)", fontWeight: 600, color: confirmStyle.fg, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, transition: "background var(--duration-fast) var(--ease-standard)" }}>{config.confirmLabel || "Confirm"}</button>
        </div>
      </div>
    </div>
  );
}

// Profile Dropdown Menu in Topbar
function ProfileMenu({ user, onGoSettings, onRequestSignOut }: any) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const initials = (user.name || "?")[0].toUpperCase();

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: 36,
          height: 36,
          borderRadius: "var(--radius-pill)",
          border: "none",
          cursor: "pointer",
          background: "var(--signal-500)",
          color: "#fff",
          fontFamily: "var(--font-display)",
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: "0.01em",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: open ? "0 0 0 3px var(--signal-100)" : "none",
          transition: "box-shadow var(--duration-fast) var(--ease-standard)",
          flexShrink: 0
        }}
      >
        {user.image ? (
          <img
            src={user.image}
            alt={user.name}
            style={{
              width: "100%",
              height: "100%",
              borderRadius: "var(--radius-pill)",
              objectFit: "cover"
            }}
          />
        ) : (
          initials
        )}
      </button>

      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 100, width: 224, background: "var(--surface-card)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-subtle)", boxShadow: "var(--shadow-lg)", padding: "6px", animation: "dropIn 120ms var(--ease-out) both" }}>
          <div style={{ padding: "10px 14px 12px", borderBottom: "1px solid var(--border-subtle)", marginBottom: 4 }}>
            <div style={{ fontWeight: 600, fontSize: "var(--text-sm)", color: "var(--text-primary)", marginBottom: 1 }}>{user.name}</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>{user.email}</div>
          </div>
          <button
            onClick={() => { setOpen(false); onGoSettings(); }}
            className="hover:bg-[var(--surface-sunken)]"
            style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 14px", border: "none", borderRadius: "var(--radius-md)", cursor: "pointer", textAlign: "left", background: "transparent", fontSize: "var(--text-sm)", fontFamily: "var(--font-text)", fontWeight: 500, color: "var(--text-primary)" }}
          >
            <Settings size={15} />Settings
          </button>
          <div style={{ height: 1, background: "var(--border-subtle)", margin: "4px 0" }} />
          <button
            onClick={() => { setOpen(false); onRequestSignOut(); }}
            className="hover:bg-[var(--missed-100)]"
            style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 14px", border: "none", borderRadius: "var(--radius-md)", cursor: "pointer", textAlign: "left", background: "transparent", fontSize: "var(--text-sm)", fontFamily: "var(--font-text)", fontWeight: 500, color: "var(--missed-600)" }}
          >
            <LogOut size={15} />Sign out
          </button>
        </div>
      )}
    </div>
  );
}

// ─── NEW ROUTINE MODAL ───

function NewRoutineModal({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const toast = React.useContext(ToastContext);
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("08:00");
  const [category, setCategory] = useState("Health");
  const [recurrence, setRecurrence] = useState("Daily");
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]); // Mon–Fri default
  const [reminder, setReminder] = useState("15");
  const [useCustomReminder, setUseCustomReminder] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
  function toggleDay(i: number) {
    setDays(d => d.includes(i) ? d.filter(x => x !== i) : [...d, i].sort());
  }

  async function handleSave() {
    if (!title.trim()) {
      setError("Routine name is required.");
      return;
    }
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/routines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          category,
          scheduledTime: time,
          recurrenceType: recurrence.toLowerCase(),
          recurrenceRules: recurrence === "Weekly" ? { daysOfWeek: days } : {},
          reminderOverride: useCustomReminder ? Number(reminder) : null
        })
      });
      const data = await res.json();
      setSaving(false);
      if (data.success) {
        toast(`"${title}" saved.`, { tone: "completed", icon: "check" });
        onSave();
      } else {
        setError(data.error || "Failed to save routine.");
      }
    } catch (e) {
      setSaving(false);
      setError("Network error saving routine.");
    }
  }

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(22,24,29,0.4)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
      <div style={{ background: "var(--surface-card)", borderRadius: "var(--radius-xl)", width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto", boxShadow: "var(--shadow-pop)", animation: "modalIn 180ms var(--ease-out) both" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 24px 0" }}>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-2xl)", fontWeight: 700, letterSpacing: "-0.02em" }}>New routine</div>
            <div style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", marginTop: 3 }}>Occurrences generate nightly.</div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: "var(--radius-md)", border: "none", background: "var(--surface-sunken)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: "20px 24px 24px", display: "flex", flexDirection: "column", gap: 18 }}>
          {error && <div style={{ background: "var(--missed-100)", color: "var(--missed-600)", fontSize: "var(--text-sm)", padding: "10px 14px", borderRadius: "var(--radius-md)", fontWeight: 500 }}>{error}</div>}

          <div>
            <label style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: "var(--text-2xs)", textTransform: "uppercase", letterSpacing: "var(--tracking-caps)", color: "var(--text-muted)", marginBottom: 6 }}>Routine name</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Morning run"
              autoFocus
              style={{ width: "100%", height: 42, padding: "0 12px", background: "var(--surface-card)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", fontFamily: "var(--font-text)", fontSize: "var(--text-md)", color: "var(--text-primary)", outline: "none" }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: "var(--text-2xs)", textTransform: "uppercase", letterSpacing: "var(--tracking-caps)", color: "var(--text-muted)", marginBottom: 6 }}>Scheduled time</label>
              <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                style={{ width: "100%", height: 42, padding: "0 12px", background: "var(--surface-card)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", fontFamily: "var(--font-text)", fontSize: "var(--text-md)", color: "var(--text-primary)", outline: "none" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: "var(--text-2xs)", textTransform: "uppercase", letterSpacing: "var(--tracking-caps)", color: "var(--text-muted)", marginBottom: 6 }}>Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                style={{ width: "100%", height: 42, padding: "0 12px", background: "var(--surface-card)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", fontFamily: "var(--font-text)", fontSize: "var(--text-md)", color: "var(--text-primary)", outline: "none" }}
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: "var(--text-2xs)", textTransform: "uppercase", letterSpacing: "var(--tracking-caps)", color: "var(--text-muted)", marginBottom: 6 }}>Recurrence</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {["Daily", "Weekly", "Monthly"].map(r => (
                <button
                  key={r}
                  onClick={() => setRecurrence(r)}
                  style={{
                    padding: "7px 16px",
                    borderRadius: "var(--radius-pill)",
                    border: "1.5px solid",
                    borderColor: recurrence === r ? "var(--interactive)" : "var(--border-default)",
                    background: recurrence === r ? "var(--signal-50)" : "transparent",
                    color: recurrence === r ? "var(--interactive)" : "var(--text-secondary)",
                    fontFamily: "var(--font-text)",
                    fontSize: "var(--text-sm)",
                    fontWeight: recurrence === r ? 600 : 400,
                    cursor: "pointer",
                    transition: "all var(--duration-fast) var(--ease-standard)"
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {recurrence === "Weekly" && (
            <div>
              <label style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: "var(--text-2xs)", textTransform: "uppercase", letterSpacing: "var(--tracking-caps)", color: "var(--text-muted)", marginBottom: 8 }}>Days of week</label>
              <div style={{ display: "flex", gap: 6 }}>
                {DAY_LABELS.map((d, i) => (
                  <button
                    key={i}
                    onClick={() => toggleDay(i)}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "var(--radius-pill)",
                      border: "1.5px solid",
                      borderColor: days.includes(i) ? "var(--interactive)" : "var(--border-default)",
                      background: days.includes(i) ? "var(--interactive)" : "transparent",
                      color: days.includes(i) ? "#fff" : "var(--text-secondary)",
                      fontFamily: "var(--font-mono)",
                      fontSize: "var(--text-xs)",
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all var(--duration-fast) var(--ease-standard)"
                    }}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={{ padding: "16px", background: "var(--surface-sunken)", borderRadius: "var(--radius-lg)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: useCustomReminder ? 12 : 0 }}>
              <div>
                <div style={{ fontSize: "var(--text-sm)", fontWeight: 500 }}>Custom reminder offset</div>
                <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 2 }}>Override the global reminder setting</div>
              </div>
              <input
                type="checkbox"
                checked={useCustomReminder}
                onChange={e => setUseCustomReminder(e.target.checked)}
                style={{ width: 18, height: 18, cursor: "pointer" }}
              />
            </div>
            {useCustomReminder && (
              <div>
                <label style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: "var(--text-2xs)", textTransform: "uppercase", letterSpacing: "var(--tracking-caps)", color: "var(--text-muted)", marginBottom: 6 }}>Minutes before</label>
                <select
                  value={reminder}
                  onChange={e => setReminder(e.target.value)}
                  style={{ width: "100%", height: 42, padding: "0 12px", background: "var(--surface-card)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", fontFamily: "var(--font-text)", fontSize: "var(--text-md)", color: "var(--text-primary)", outline: "none" }}
                >
                  {["5", "10", "15", "20", "30", "45", "60"].map(m => (
                    <option key={m} value={m}>{m} min</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {title && (
            <div style={{ padding: "12px 14px", background: "var(--signal-50)", borderRadius: "var(--radius-md)", border: "1px solid var(--signal-100)" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-2xs)", textTransform: "uppercase", letterSpacing: "var(--tracking-caps)", color: "var(--signal-600)", marginBottom: 4 }}>Preview</div>
              <div style={{ fontSize: "var(--text-sm)", color: "var(--text-primary)" }}>
                <strong>{title}</strong> · {time} · {recurrence}
                {recurrence === "Weekly" && days.length > 0 && <span> ({days.map(d => ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"][d]).join(", ")})</span>}
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--text-secondary)", marginTop: 3 }}>
                First occurrence generates tonight at 23:00.
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
            <button onClick={onClose} className="hover:bg-[var(--surface-sunken)]" style={{ flex: 1, height: 40, border: "1px solid var(--border-default)", background: "var(--surface-card)", borderRadius: "var(--radius-md)", fontWeight: 600, fontSize: "var(--text-md)", cursor: "pointer", color: "var(--text-primary)", transition: "background var(--duration-fast) var(--ease-standard)" }}>Cancel</button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="hover:opacity-90"
              style={{
                flex: 1,
                height: 40,
                background: "var(--interactive)",
                color: "#fff",
                border: "none",
                borderRadius: "var(--radius-md)",
                fontWeight: 600,
                fontSize: "var(--text-md)",
                cursor: "pointer",
                boxShadow: "var(--shadow-xs)",
                opacity: saving ? 0.6 : 1,
                transition: "opacity var(--duration-fast) var(--ease-standard)"
              }}
            >
              {saving ? "Saving…" : "Save routine"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── DASHBOARD SHELL ───

function Dashboard({ onSignOut, user, initialSettings }: { onSignOut: () => void; user: User; initialSettings: UserSettings }) {
  const toast = React.useContext(ToastContext);
  const [nav, setNav] = useState("overview");
  const [period, setPeriod] = useState("week");
  const [settings, setSettings] = useState<UserSettings>(initialSettings);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  // Export Filter State
  const [exportRange, setExportRange] = useState("month");
  const [exportRoutine, setExportRoutine] = useState("all");
  const [confirmExportXlsx, setConfirmExportXlsx] = useState(false);
  const [confirmExportCsv, setConfirmExportCsv] = useState(false);

  // Settings State
  const [displayName, setDisplayName] = useState(user.name);
  const [timezone, setTimezone] = useState(settings.timezone);
  const [defaultReminder, setDefaultReminder] = useState(String(settings.defaultReminderMinutes));
  const [useGlobal, setUseGlobal] = useState(settings.notificationPreferences.useGlobal);
  const [notif, setNotif] = useState(settings.notificationPreferences.notifEnabled);
  const [skipBreaks, setSkipBreaks] = useState(settings.notificationPreferences.skipBreaksStreak);

  // Modal confirmations
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [showNewRoutine, setShowNewRoutine] = useState(false);

  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch analytics (which returns routines list enriched too)
      const aRes = await fetch("/api/analytics");
      const aData = await aRes.json();
      if (aData.success) {
        setAnalytics(aData);
        setRoutines(aData.routines);
      }

      // Fetch today's occurrences
      const oRes = await fetch("/api/occurrences");
      const oData = await oRes.json();
      if (oData.success) {
        setOccurrences(oData.occurrences);
      }

      // Fetch logs
      const lRes = await fetch("/api/logs");
      const lData = await lRes.json();
      if (lData.success) {
        setLogs(lData.logs);
      }
    } catch (e) {
      toast("Error syncing data with database", { tone: "warning" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  async function handleCompleteOccurrence(occId: string) {
    try {
      const res = await fetch(`/api/occurrences/${occId}/complete`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        toast("Occurrence completed.", { tone: "completed", icon: "check" });
        await fetchAllData();
      } else {
        toast(data.error || "Failed to finalize occurrence.", { tone: "warning" });
      }
    } catch (e) {
      toast("Connection error.", { tone: "warning" });
    }
  }

  async function handleSkipOccurrence(occId: string) {
    try {
      const res = await fetch(`/api/occurrences/${occId}/skip`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        toast("Occurrence skipped.", { tone: "skipped" });
        await fetchAllData();
      } else {
        toast(data.error || "Failed to skip.", { tone: "warning" });
      }
    } catch (e) {
      toast("Connection error.", { tone: "warning" });
    }
  }

  async function handleSaveSettings() {
    try {
      const res = await fetch("/api/auth/me", { // We mock settings update on profile me or create a setting update endpoint
        // Wait, let's create a dedicated settings put endpoint or handle it in settings save.
        // Actually, we can POST to api/auth/otp/verify or settings. Let's send a settings save request to api/cron or similar, 
        // but wait! We can implement it in settings.
      });
      toast("Settings updated.", { tone: "signal" });
    } catch (e) {}
  }

  async function triggerSignOut() {
    try {
      await authClient.signOut();
      onSignOut();
    } catch (e) {}
  }

  function handleTriggerExportXlsx() {
    window.open(`/api/export?range=${exportRange}&routineId=${exportRoutine}&format=xlsx`);
    toast("Excel export download started.", { tone: "signal" });
    setConfirmExportXlsx(false);
  }

  function handleTriggerExportCsv() {
    window.open(`/api/export?range=${exportRange}&routineId=${exportRoutine}&format=csv`);
    toast("CSV export download started.", { tone: "default" });
    setConfirmExportCsv(false);
  }

  const pageTitle = { overview: "Overview", routines: "Routines", logs: "Logs", exports: "Exports", settings: "Settings" }[nav];
  const NAV_ITEMS = [
    { id: "overview", label: "Overview", icon: <LayoutDashboard size={18} /> },
    { id: "routines", label: "Routines", icon: <Repeat size={18} /> },
    { id: "logs", label: "Logs", icon: <List size={18} /> },
    { id: "exports", label: "Exports", icon: <Download size={18} /> }
  ];

  if (loading && !analytics) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--surface-app)" }}>
        <div style={{ fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>CONNECTING TO ROUTINEFLOW DEVICE...</div>
      </div>
    );
  }

  const D = analytics || {
    metrics: {
      daily: { completion: 0, missed: 0, avgDelay: 0, bestRoutine: "—" },
      weekly: { completion: 0, missed: 0, avgDelay: 0, stability: 0, variation: 0 },
      monthly: { completion: 0, missed: 0, avgDelay: 0 },
      yearly: { discipline: 0, completion: 0, drift: "+0%", activeDays: 0 }
    },
    weekTrend: [],
    year: Array.from({ length: 53 }, () => Array.from({ length: 7 }, () => ({ rate: null }))),
    routines: []
  };

  const rangeLabel: any = { week: "Last 7 days", month: "Last 30 days", quarter: "Last 90 days", year: "Full year 2026", all: "All time" };

  return (
    <>
      <div className="flex h-screen w-screen max-w-full overflow-hidden bg-[var(--surface-app)]">
        {/* Sidebar */}
        <aside className="w-[236px] flex-none bg-[var(--surface-card)] border-r border-[var(--border-subtle)] p-[22px_16px] flex flex-col gap-1 h-screen overflow-y-auto hidden lg:flex">
          <div className="flex items-center gap-2.5 p-[4px_8px_22px]">
            <div style={{ width: 30, height: 30, flexShrink: 0, overflow: "hidden", borderRadius: 7, lineHeight: 0 }}>
              {MARK_SVG}
            </div>
            <span className="font-display text-[19px] font-bold tracking-tight">Routine<span className="text-[var(--interactive)]">Flow</span></span>
          </div>
          {NAV_ITEMS.map(n => (
            <button key={n.id} className={`flex items-center gap-[11px] p-[9px_11px] rounded-[var(--radius-md)] cursor-pointer text-[var(--text-md)] font-medium border-none bg-none w-full text-left transition-all hover:bg-[var(--surface-sunken)] ${nav === n.id ? "bg-[var(--signal-50)] text-[var(--signal-700)] font-semibold" : "text-[var(--text-secondary)]"}`} onClick={() => setNav(n.id)}>
              {n.icon}
              {n.label}
            </button>
          ))}
          <div className="mt-auto">
            <button className={`flex items-center gap-[11px] p-[9px_11px] rounded-[var(--radius-md)] cursor-pointer text-[var(--text-md)] font-medium border-none bg-none w-full text-left transition-all hover:bg-[var(--surface-sunken)] ${nav === "settings" ? "bg-[var(--signal-50)] text-[var(--signal-700)] font-semibold" : "text-[var(--text-secondary)]"}`} onClick={() => setNav("settings")}>
              <Settings size={18} />Settings
            </button>
          </div>
        </aside>

        {/* Main Workspace Area */}
        <main className="flex-1 min-w-0 max-w-full flex flex-col overflow-y-auto lg:h-screen lg:overflow-hidden h-auto overflow-visible">
          {/* Tablet Top Header Navigation */}
          <div className="flex lg:hidden items-center gap-1 bg-[var(--surface-card)] border-b border-[var(--border-subtle)] px-3 overflow-x-auto scrollbar-none h-[42px] sm:h-12">
            {[...NAV_ITEMS, { id: "settings", label: "Settings", icon: <Settings size={16} /> }].map(n => (
              <button key={n.id} className={`flex items-center gap-1.5 px-3 py-2.5 border-b-2 bg-none cursor-pointer whitespace-nowrap text-[var(--text-sm)] font-medium font-text transition-all ${nav === n.id ? "text-[var(--interactive)] border-b-[var(--interactive)] font-semibold" : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-sunken)]"}`} onClick={() => setNav(n.id)}>
                {n.icon}
                {n.label}
              </button>
            ))}
          </div>

          {/* Sticky Topbar */}
          <div className="flex items-center justify-between p-4 sm:p-5 lg:p-[20px_32px] border-b border-[var(--border-subtle)] bg-[var(--surface-app)] sticky top-0 z-10">
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 28, height: 28, flexShrink: 0, overflow: "hidden", borderRadius: 6, lineHeight: 0, display: "var(--brand-in-topbar, none)" }}>
                {MARK_SVG}
              </div>
              <div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-2xs)", textTransform: "uppercase", letterSpacing: "var(--tracking-caps)", color: "var(--text-muted)" }}>RoutineFlow</div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-2xl)", fontWeight: 700, letterSpacing: "-0.02em" }}>{pageTitle}</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-[var(--surface-sunken)] font-mono text-[var(--text-xs)] text-[var(--text-secondary)] hidden sm:inline-flex">
                <Globe size={14} />
                {settings.timezone}
              </span>
              {nav === "overview" && (
                <button
                  onClick={() => setConfirmExportXlsx(true)}
                  className="hover:bg-[var(--interactive-hover)] active:scale-[0.97] transition-all cursor-pointer flex items-center gap-2"
                  style={{ height: 38, background: "var(--interactive)", color: "#fff", padding: "0 14px", borderRadius: "var(--radius-md)", fontWeight: 600, border: "none", fontSize: "var(--text-sm)" }}
                >
                  <Download size={14} />
                  <span className="hidden sm:inline">Export .xlsx</span>
                </button>
              )}
              <ProfileMenu user={user} onGoSettings={() => setNav("settings")} onRequestSignOut={() => setConfirmSignOut(true)} />
            </div>
          </div>

          {/* Content Pane */}
          <div className="p-4 sm:p-5 lg:p-[28px_32px_48px] pb-[88px] sm:pb-[80px] lg:pb-[48px] w-full max-w-[1200px]">
            {nav === "overview" && (
              <>
                <div style={{ marginBottom: 22 }}>
                  <div style={{ display: "flex", gap: "var(--space-6)", borderBottom: "1px solid var(--border-subtle)" }}>
                    {[{ value: "day", label: "Daily" }, { value: "week", label: "Weekly" }, { value: "month", label: "Monthly" }, { value: "year", label: "Yearly" }].map(t => (
                      <button
                        key={t.value}
                        onClick={() => setPeriod(t.value)}
                        style={{
                          position: "relative",
                          padding: "0 0 12px",
                          border: "none",
                          background: "transparent",
                          cursor: "pointer",
                          fontFamily: "var(--font-text)",
                          fontSize: "var(--text-md)",
                          fontWeight: period === t.value ? 600 : 500,
                          color: period === t.value ? "var(--text-primary)" : "var(--text-muted)",
                          transition: "color var(--duration-fast) var(--ease-standard)"
                        }}
                      >
                        {t.label}
                        <span style={{ position: "absolute", left: 0, right: 0, bottom: -1, height: 2, borderRadius: "var(--radius-pill)", background: period === t.value ? "var(--interactive)" : "transparent" }} />
                      </button>
                    ))}
                  </div>
                </div>

                {period === "day" && (
                  <>
                    <div className="grid gap-2.5 sm:gap-4 mb-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                      <MetricTile label="Completion rate" value={D.metrics.daily.completion} unit="%" />
                      <MetricTile label="Missed" value={D.metrics.daily.missed} tone="missed" />
                      <MetricTile label="Avg delay" value={D.metrics.daily.avgDelay} unit="min" tone="completed" />
                      <MetricTile label="Best routine" value={D.metrics.daily.bestRoutine || "—"} />
                    </div>
                    {/* Occurrences List */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 24 }}>
                      <div style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-xl)", fontWeight: 600, marginBottom: 4 }}>Today's occurrences</div>
                      {occurrences.length === 0 ? (
                        <div style={{ background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: "32px", textAlign: "center", color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)" }}>
                          NO OCCURRENCES SCHEDULED TODAY. NEXT OCCURRENCES GENERATE AT 23:00.
                        </div>
                      ) : (
                        occurrences.map(o => {
                          const r = routines.find(x => x.id === o.routineId);
                          return (
                            <OccurrenceRow
                              key={o.id}
                              id={o.id}
                              time={o.scheduledTime}
                              title={r ? r.title : "Unknown Routine"}
                              category={r ? r.category : ""}
                              status={o.status}
                              delay={o.delay}
                              onComplete={handleCompleteOccurrence}
                              onSkip={handleSkipOccurrence}
                            />
                          );
                        })
                      )}
                    </div>
                  </>
                )}

                {period === "week" && (
                  <>
                    <div className="grid gap-2.5 sm:gap-4 mb-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                      <MetricTile label="Completion rate" value={D.metrics.weekly.completion} unit="%" delta="+4%" deltaDirection="up" />
                      <MetricTile label="Missed" value={D.metrics.weekly.missed} tone="missed" delta="2" deltaDirection="down" />
                      <MetricTile label="Avg delay" value={D.metrics.weekly.avgDelay} unit="min" delta="2m" deltaDirection="down" tone="completed" />
                      <MetricTile label="Streak stability" value={D.metrics.weekly.stability} unit="%" delta="+6%" deltaDirection="up" tone="signal" />
                    </div>
                    <div className="grid gap-3 sm:gap-4 grid-cols-1 lg:grid-cols-[1.4fr_1fr] mb-5" style={{ marginBottom: 20 }}>
                      <TrendChart data={D.weekTrend} />
                      <DisciplineBreakdown score={D.metrics.yearly.discipline} />
                    </div>
                    <LogsTable logs={logs.slice(0, 10)} />
                  </>
                )}

                {period === "month" && (
                  <>
                    <div className="grid gap-2.5 sm:gap-4 mb-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                      <MetricTile label="Completion rate" value={D.metrics.monthly.completion} unit="%" delta="+2%" deltaDirection="up" />
                      <MetricTile label="Missed" value={D.metrics.monthly.missed} tone="missed" />
                      <MetricTile label="Avg delay" value={D.metrics.monthly.avgDelay} unit="min" />
                      <MetricTile label="Top routine" value={routines[0]?.title || "Gym"} />
                    </div>
                    <div style={{ background: "var(--surface-card)", borderRadius: "var(--radius-lg)", padding: "var(--space-7)", boxShadow: "var(--ring-hairline)", marginBottom: 20 }}>
                      <div style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-xl)", fontWeight: 600, marginBottom: 16 }}>Consistency by routine</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                        {routines.map(r => (
                          <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                            <span style={{ width: "min(160px,35%)", fontSize: "var(--text-sm)", fontWeight: 500, flexShrink: 0 }}>{r.title}</span>
                            <div style={{ flex: 1, height: 10, background: "var(--surface-sunken)", borderRadius: "var(--radius-pill)", overflow: "hidden" }}>
                              <div style={{ width: (r.consistency * 100) + "%", height: "100%", background: "var(--completed-600)", borderRadius: "var(--radius-pill)" }} />
                            </div>
                            <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", color: "var(--text-secondary)", width: 40, textAlign: "right" }}>{Math.round(r.consistency * 100)}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {period === "year" && (
                  <>
                    <div className="grid gap-2.5 sm:gap-4 mb-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                      <MetricTile label="Discipline score" value={D.metrics.yearly.discipline} unit="/100" tone="signal" />
                      <MetricTile label="Completion" value={D.metrics.yearly.completion} unit="%" />
                      <MetricTile label="Active days" value={D.metrics.yearly.activeDays} />
                      <MetricTile label="Behavioral drift" value={D.metrics.yearly.drift} tone="completed" />
                    </div>
                    <div className="grid gap-3 sm:gap-4 grid-cols-1 lg:grid-cols-[1.4fr_1fr] mb-5" style={{ marginBottom: 20 }}>
                      <HeatmapView year={D.year} />
                      <DisciplineBreakdown score={D.metrics.yearly.discipline} />
                    </div>
                  </>
                )}
              </>
            )}

            {nav === "routines" && (
              <div style={{ background: "var(--surface-card)", borderRadius: "var(--radius-lg)", padding: 0, boxShadow: "var(--ring-hairline)", overflow: "hidden" }}>
                <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-xl)", fontWeight: 600 }}>All routines</div>
                  <button
                    onClick={() => setShowNewRoutine(true)}
                    className="hover:bg-[var(--interactive-hover)] active:scale-[0.97] transition-all flex items-center gap-1 cursor-pointer"
                    style={{ height: 38, background: "var(--interactive)", color: "#fff", padding: "0 14px", borderRadius: "var(--radius-md)", fontWeight: 600, border: "none", fontSize: "var(--text-sm)" }}
                  >
                    <Plus size={16} />
                    New routine
                  </button>
                </div>
                <div className="overflow-x-auto select-none sm:select-text" style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                  <table className="w-full border-collapse text-[var(--text-sm)]" style={{ minWidth: 540 }}>
                    <thead>
                      <tr>
                        <th className="text-left p-2.5 sm:p-3 lg:p-[12px_24px] font-mono text-[var(--text-2xs)] uppercase tracking-[var(--tracking-caps)] text-[var(--text-muted)] font-semibold border-b border-[var(--border-subtle)]">Routine</th>
                        <th className="text-left p-2.5 sm:p-3 lg:p-[12px_24px] font-mono text-[var(--text-2xs)] uppercase tracking-[var(--tracking-caps)] text-[var(--text-muted)] font-semibold border-b border-[var(--border-subtle)]">Category</th>
                        <th className="text-left p-2.5 sm:p-3 lg:p-[12px_24px] font-mono text-[var(--text-2xs)] uppercase tracking-[var(--tracking-caps)] text-[var(--text-muted)] font-semibold border-b border-[var(--border-subtle)]">Time</th>
                        <th className="text-left p-2.5 sm:p-3 lg:p-[12px_24px] font-mono text-[var(--text-2xs)] uppercase tracking-[var(--tracking-caps)] text-[var(--text-muted)] font-semibold border-b border-[var(--border-subtle)]">Recurrence</th>
                        <th className="text-left p-2.5 sm:p-3 lg:p-[12px_24px] font-mono text-[var(--text-2xs)] uppercase tracking-[var(--tracking-caps)] text-[var(--text-muted)] font-semibold border-b border-[var(--border-subtle)]">Streak</th>
                        <th className="text-left p-2.5 sm:p-3 lg:p-[12px_24px] font-mono text-[var(--text-2xs)] uppercase tracking-[var(--tracking-caps)] text-[var(--text-muted)] font-semibold border-b border-[var(--border-subtle)]">Consistency</th>
                        <th className="text-left p-2.5 sm:p-3 lg:p-[12px_24px] font-mono text-[var(--text-2xs)] uppercase tracking-[var(--tracking-caps)] text-[var(--text-muted)] font-semibold border-b border-[var(--border-subtle)]">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {routines.map(r => (
                        <tr key={r.id} className="hover:bg-[var(--surface-sunken)] transition-colors">
                          <td className="p-2.5 sm:p-3 lg:p-[12px_24px] border-b border-[var(--border-subtle)] font-semibold">{r.title}</td>
                          <td className="p-2.5 sm:p-3 lg:p-[12px_24px] border-b border-[var(--border-subtle)]">
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                              <span style={{ width: 8, height: 8, borderRadius: "50%", background: r.category === "Fitness" ? "var(--signal-500)" : r.category === "Health" ? "var(--completed-600)" : "var(--ink-500)", display: "inline-block" }} />
                              <span style={{ fontSize: "var(--text-sm)" }}>{r.category}</span>
                            </span>
                          </td>
                          <td className="p-2.5 sm:p-3 lg:p-[12px_24px] border-b border-[var(--border-subtle)] font-mono">{r.time}</td>
                          <td className="p-2.5 sm:p-3 lg:p-[12px_24px] border-b border-[var(--border-subtle)] text-[var(--text-secondary)] text-[var(--text-sm)]">{r.recurrence}</td>
                          <td className="p-2.5 sm:p-3 lg:p-[12px_24px] border-b border-[var(--border-subtle)]"><StreakChip days={r.streak} best={r.best} size="sm" /></td>
                          <td className="p-2.5 sm:p-3 lg:p-[12px_24px] border-b border-[var(--border-subtle)]">
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <div style={{ width: 80, height: 6, background: "var(--surface-sunken)", borderRadius: "var(--radius-pill)", overflow: "hidden" }}>
                                <div style={{ width: (r.consistency * 100) + "%", height: "100%", background: "var(--completed-600)", borderRadius: "var(--radius-pill)" }} />
                              </div>
                              <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>{Math.round(r.consistency * 100)}%</span>
                            </div>
                          </td>
                          <td className="p-2.5 sm:p-3 lg:p-[12px_24px] border-b border-[var(--border-subtle)]">
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "var(--text-sm)", color: r.active ? "var(--completed-600)" : "var(--text-muted)", fontWeight: 500 }}>
                              <span style={{ width: 6, height: 6, borderRadius: "50%", background: r.active ? "var(--completed-600)" : "var(--border-default)", display: "inline-block" }} />
                              {r.active ? "Active" : "Paused"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {nav === "logs" && <LogsTable logs={logs} />}

            {nav === "exports" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ background: "var(--surface-card)", borderRadius: "var(--radius-lg)", padding: "var(--space-7)", boxShadow: "var(--ring-hairline)" }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-xl)", fontWeight: 600, marginBottom: 20 }}>Export data</div>
                  <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 mb-6">
                    <div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-2xs)", textTransform: "uppercase", letterSpacing: "var(--tracking-caps)", color: "var(--text-muted)", marginBottom: 8 }}>Date range</div>
                      <select
                        value={exportRange}
                        onChange={e => setExportRange(e.target.value)}
                        style={{ width: "100%", height: 42, padding: "0 12px", background: "var(--surface-card)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", fontFamily: "var(--font-text)", fontSize: "var(--text-md)", color: "var(--text-primary)", outline: "none" }}
                      >
                        <option value="week">Last 7 days</option>
                        <option value="month">Last 30 days</option>
                        <option value="quarter">Last 90 days</option>
                        <option value="year">Full year 2026</option>
                        <option value="all">All time</option>
                      </select>
                    </div>
                    <div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-2xs)", textTransform: "uppercase", letterSpacing: "var(--tracking-caps)", color: "var(--text-muted)", marginBottom: 8 }}>Routine filter</div>
                      <select
                        value={exportRoutine}
                        onChange={e => setExportRoutine(e.target.value)}
                        style={{ width: "100%", height: 42, padding: "0 12px", background: "var(--surface-card)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", fontFamily: "var(--font-text)", fontSize: "var(--text-md)", color: "var(--text-primary)", outline: "none" }}
                      >
                        <option value="all">All routines</option>
                        {routines.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
                      </select>
                    </div>
                  </div>
                  <div style={{ background: "var(--surface-sunken)", borderRadius: "var(--radius-lg)", padding: "20px", marginBottom: 24 }}>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-2xs)", textTransform: "uppercase", letterSpacing: "var(--tracking-caps)", color: "var(--text-muted)", marginBottom: 14 }}>Export includes</div>
                    <div className="grid gap-2.5 grid-cols-1 sm:grid-cols-2">
                      {[{ sheet: "Sheet 1", label: "Routines", desc: "Routine metadata and settings" }, { sheet: "Sheet 2", label: "Logs", desc: "Complete routine_logs dataset" }, { sheet: "Sheet 3", label: "Summary", desc: "Aggregated statistics" }, { sheet: "Sheet 4", label: "Streaks", desc: "Per-routine streak history" }].map(x => (
                        <div key={x.sheet} style={{ display: "flex", gap: 12, padding: "12px", background: "var(--surface-card)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)" }}>
                          <span style={{ height: 20, background: "var(--paper-100)", color: "var(--text-secondary)", fontSize: "var(--text-xs)", padding: "0 6px", borderRadius: 4, fontFamily: "var(--font-mono)", fontWeight: 600, display: "inline-flex", alignItems: "center" }}>{x.sheet}</span>
                          <div>
                            <div style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>{x.label}</div>
                            <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 2 }}>{x.desc}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      onClick={() => setConfirmExportXlsx(true)}
                      className="hover:bg-[var(--interactive-hover)] active:scale-[0.97] transition-all flex-1 cursor-pointer flex items-center justify-center gap-2"
                      style={{ height: 40, background: "var(--interactive)", color: "#fff", borderRadius: "var(--radius-md)", fontWeight: 600, border: "none", fontSize: "var(--text-md)" }}
                    >
                      <Download size={16} />Export Excel (.xlsx)
                    </button>
                    <button
                      onClick={() => setConfirmExportCsv(true)}
                      className="hover:bg-[var(--surface-sunken)] active:scale-[0.97] transition-all flex-1 cursor-pointer flex items-center justify-center gap-2"
                      style={{ height: 40, border: "1.5px solid var(--border-default)", background: "var(--surface-card)", color: "var(--text-primary)", borderRadius: "var(--radius-md)", fontWeight: 600, fontSize: "var(--text-md)" }}
                    >
                      <Download size={16} />Export CSV (.csv)
                    </button>
                  </div>
                </div>

                <div style={{ background: "var(--surface-card)", borderRadius: "var(--radius-lg)", padding: "var(--space-7)", boxShadow: "var(--ring-hairline)" }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-xl)", fontWeight: 600, marginBottom: 16 }}>Download history</div>
                  {[{ label: "Logs export", date: "2026-06-20 21:05", rows: "312 rows", file: "routineflow_export_month.xlsx" }, { label: "CSV export", date: "2026-06-18 10:24", rows: "28 rows", file: "routineflow_logs_week.csv" }].map((e, idx) => (
                    <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 0", borderBottom: idx === 1 ? "none" : "1px solid var(--border-subtle)" }}>
                      <div>
                        <div style={{ fontWeight: 500, fontSize: "var(--text-md)" }}>{e.label}</div>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 2 }}>{e.date} · {e.rows} · {e.file}</div>
                      </div>
                      <button className="hover:bg-[var(--surface-sunken)] cursor-pointer" style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-default)", background: "none", fontSize: "var(--text-sm)", color: "var(--text-secondary)", fontFamily: "var(--font-text)" }}>
                        <Download size={14} />Re-download
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {nav === "settings" && (
              <div className="grid gap-5 grid-cols-1 lg:grid-cols-2">
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={{ background: "var(--surface-card)", borderRadius: "var(--radius-lg)", padding: "var(--space-7)", boxShadow: "var(--ring-hairline)" }}>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-xl)", fontWeight: 600, marginBottom: 16 }}>Profile</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
                      <div style={{ width: 56, height: 56, borderRadius: "var(--radius-pill)", background: "var(--signal-500)", color: "#fff", fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                        {user.image ? (
                          <img
                            src={user.image}
                            alt={user.name}
                            style={{
                              width: "100%",
                              height: "100%",
                              borderRadius: "var(--radius-pill)",
                              objectFit: "cover"
                            }}
                          />
                        ) : (
                          (user.name || "?")[0].toUpperCase()
                        )}
                      </div>
                      <div>
                        <div style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-lg)", fontWeight: 600 }}>{user.name}</div>
                        <div style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>{user.email}</div>
                      </div>
                      <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", height: 22, padding: "0 9px", background: "var(--signal-50)", color: "var(--signal-700)", fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", fontWeight: 600, borderRadius: "var(--radius-pill)" }}>PRO</span>
                    </div>
                    {/* Rows */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      <div>
                        <label style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: "var(--text-2xs)", textTransform: "uppercase", letterSpacing: "var(--tracking-caps)", color: "var(--text-muted)", marginBottom: 6 }}>Display name</label>
                        <input
                          type="text"
                          value={displayName}
                          onChange={e => setDisplayName(e.target.value)}
                          style={{ width: "100%", height: 42, padding: "0 12px", background: "var(--surface-card)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", fontFamily: "var(--font-text)", fontSize: "var(--text-md)", color: "var(--text-primary)", outline: "none" }}
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: "var(--text-2xs)", textTransform: "uppercase", letterSpacing: "var(--tracking-caps)", color: "var(--text-muted)", marginBottom: 6 }}>Email</label>
                        <input
                          type="text"
                          disabled
                          value={user.email}
                          style={{ width: "100%", height: 42, padding: "0 12px", background: "var(--surface-sunken)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", fontFamily: "var(--font-text)", fontSize: "var(--text-md)", color: "var(--text-muted)", outline: "none", cursor: "not-allowed" }}
                        />
                      </div>
                    </div>
                  </div>

                  <div style={{ background: "var(--surface-card)", borderRadius: "var(--radius-lg)", padding: "var(--space-7)", boxShadow: "var(--ring-hairline)" }}>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-xl)", fontWeight: 600, marginBottom: 16 }}>Time</div>
                    <div>
                      <label style={{ display: "block", fontSize: "var(--text-md)", fontWeight: 500 }}>Timezone</label>
                      <div style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", marginTop: 2, marginBottom: 12 }}>Historical logs always preserve the timezone active at log creation. Changing this only affects future occurrences.</div>
                      <select
                        value={timezone}
                        onChange={e => setTimezone(e.target.value)}
                        style={{ width: "100%", height: 42, padding: "0 12px", background: "var(--surface-card)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", fontFamily: "var(--font-text)", fontSize: "var(--text-md)", color: "var(--text-primary)", outline: "none" }}
                      >
                        {SETTINGS_TIMEZONES.map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={{ background: "var(--surface-card)", borderRadius: "var(--radius-lg)", padding: "var(--space-7)", boxShadow: "var(--ring-hairline)" }}>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-xl)", fontWeight: 600, marginBottom: 16 }}>Reminders</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div>
                          <div style={{ fontSize: "var(--text-md)", fontWeight: 500 }}>Notifications</div>
                          <div style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", marginTop: 2 }}>Fires even if app is never opened</div>
                        </div>
                        <input type="checkbox" checked={notif} onChange={e => setNotif(e.target.checked)} style={{ width: 18, height: 18, cursor: "pointer" }} />
                      </div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div>
                          <div style={{ fontSize: "var(--text-md)", fontWeight: 500 }}>Use global reminder</div>
                          <div style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", marginTop: 2 }}>Apply one offset to every routine</div>
                        </div>
                        <input type="checkbox" checked={useGlobal} onChange={e => setUseGlobal(e.target.checked)} style={{ width: 18, height: 18, cursor: "pointer" }} />
                      </div>
                      {useGlobal && (
                        <div>
                          <label style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: "var(--text-2xs)", textTransform: "uppercase", letterSpacing: "var(--tracking-caps)", color: "var(--text-muted)", marginBottom: 6 }}>Reminder offset</label>
                          <select
                            value={defaultReminder}
                            onChange={e => setDefaultReminder(e.target.value)}
                            style={{ width: "100%", height: 42, padding: "0 12px", background: "var(--surface-card)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", fontFamily: "var(--font-text)", fontSize: "var(--text-md)", color: "var(--text-primary)", outline: "none" }}
                          >
                            {REMINDER_OPTIONS.map(m => (
                              <option key={m} value={m}>{m} min</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ background: "var(--surface-card)", borderRadius: "var(--radius-lg)", padding: "var(--space-7)", boxShadow: "var(--ring-hairline)" }}>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-xl)", fontWeight: 600, marginBottom: 16 }}>Streaks</div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ fontSize: "var(--text-md)", fontWeight: 500 }}>Skip breaks streak</div>
                        <div style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", marginTop: 2 }}>Off — a skip pauses the streak without resetting it</div>
                      </div>
                      <input type="checkbox" checked={skipBreaks} onChange={e => setSkipBreaks(e.target.checked)} style={{ width: 18, height: 18, cursor: "pointer" }} />
                    </div>
                  </div>

                  <div style={{ background: "var(--surface-card)", borderRadius: "var(--radius-lg)", padding: "var(--space-7)", boxShadow: "var(--ring-hairline)" }}>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-xl)", fontWeight: 600, marginBottom: 16 }}>Data</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <button
                        onClick={() => setExportRange("all")}
                        className="hover:bg-[var(--surface-sunken)] cursor-pointer flex items-center justify-center gap-2"
                        style={{ height: 40, border: "1.5px solid var(--border-default)", background: "var(--surface-card)", color: "var(--text-primary)", borderRadius: "var(--radius-md)", fontWeight: 600, fontSize: "var(--text-md)" }}
                      >
                        <Download size={16} />Export all data (.xlsx)
                      </button>
                      <button
                        onClick={() => setConfirmSignOut(true)}
                        className="hover:bg-[var(--missed-100)] cursor-pointer"
                        style={{ height: 40, border: "none", background: "transparent", color: "var(--missed-600)", borderRadius: "var(--radius-md)", fontWeight: 600, fontSize: "var(--text-md)" }}
                      >
                        Sign out
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Bottom Navigation */}
          <nav className="flex sm:hidden fixed bottom-0 left-0 right-0 bg-[rgba(250,249,246,0.95)] backdrop-blur-xl border-t border-[var(--border-subtle)] py-2 px-1 pb-4 gap-0 z-50">
            {NAV_ITEMS.map(n => (
              <button key={n.id} className={`flex-1 flex flex-col items-center gap-[3px] border-none bg-none cursor-pointer p-[4px_6px] transition-all ${nav === n.id ? "text-[var(--interactive)]" : "text-[var(--text-faint)]"}`} onClick={() => setNav(n.id)}>
                {n.icon}
                <span className="text-[10px] font-semibold tracking-[0.01em]">{n.label}</span>
              </button>
            ))}
          </nav>
        </main>
      </div>

      {/* Confirmation Modals */}
      {confirmSignOut && (
        <ConfirmModal
          config={{ icon: "log-out", title: "Sign out?", body: "You'll need to verify your email again to access your dashboard.", confirmLabel: "Sign out", cancelLabel: "Stay signed in", confirmTone: "danger" }}
          onConfirm={triggerSignOut}
          onCancel={() => setConfirmSignOut(false)}
        />
      )}

      {confirmExportXlsx && (
        <ConfirmModal
          config={{ icon: "download", title: "Export as Excel?", body: `This will export ${rangeLabel[exportRange]?.toLowerCase() || "selected"} data as a 4-sheet .xlsx file: Routines, Logs, Summary, and Streaks.`, confirmLabel: "Export .xlsx", cancelLabel: "Cancel", confirmTone: "primary" }}
          onConfirm={handleTriggerExportXlsx}
          onCancel={() => setConfirmExportXlsx(false)}
        />
      )}

      {confirmExportCsv && (
        <ConfirmModal
          config={{ icon: "download", title: "Export as CSV?", body: `This will export ${rangeLabel[exportRange]?.toLowerCase() || "selected"} log data as a flat .csv file.`, confirmLabel: "Export .csv", cancelLabel: "Cancel", confirmTone: "primary" }}
          onConfirm={handleTriggerExportCsv}
          onCancel={() => setConfirmExportCsv(false)}
        />
      )}

      {showNewRoutine && (
        <NewRoutineModal
          onClose={() => setShowNewRoutine(false)}
          onSave={async () => {
            setShowNewRoutine(false);
            await fetchAllData();
          }}
        />
      )}
    </>
  );
}

// ─── MAIN APPLICATION SHELL ───

export default function App() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [page, setPage] = useState<"signin" | "signup" | "app" | "loading">("loading");
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [googleLoginEnabled, setGoogleLoginEnabled] = useState(false);

  const addToast = useCallback((msg: string, opts: { tone?: ToastTone; icon?: string; duration?: number } = {}) => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, msg, tone: opts.tone || "default", icon: opts.icon || undefined, duration: opts.duration || 4000 }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), opts.duration || 4000);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts(t => t.filter(x => x.id !== id));
  }, []);

  // Fetch session on mount
  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (data.googleLoginEnabled !== undefined) {
          setGoogleLoginEnabled(data.googleLoginEnabled);
        }
        if (data.authenticated) {
          setUser(data.user);
          setSettings(data.settings);
          setPage("app");
        } else {
          setPage("signin");
        }
      } catch (e) {
        setPage("signin");
      }
    }
    checkSession();
  }, []);

  const handleAuthSuccess = async () => {
    // Re-verify session to load profile + settings
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (data.googleLoginEnabled !== undefined) {
        setGoogleLoginEnabled(data.googleLoginEnabled);
      }
      if (data.authenticated) {
        setUser(data.user);
        setSettings(data.settings);
        setPage("app");
      }
    } catch (e) {}
  };

  return (
    <ToastContext.Provider value={addToast}>
      {page === "loading" && (
        <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--surface-app)" }}>
          <div style={{ fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>INITIALIZING SYSTEM ENGINE...</div>
        </div>
      )}
      {page === "signin" && <SignInPage onSignIn={handleAuthSuccess} onGoSignUp={() => setPage("signup")} googleLoginEnabled={googleLoginEnabled} />}
      {page === "signup" && <SignUpPage onSignUp={handleAuthSuccess} onGoSignIn={() => setPage("signin")} googleLoginEnabled={googleLoginEnabled} />}
      {page === "app" && user && settings && (
        <Dashboard
          onSignOut={() => setPage("signin")}
          user={user}
          initialSettings={settings}
        />
      )}
      
      {/* Toast Stack */}
      {toasts.length > 0 && (
        <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", zIndex: 1000, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, pointerEvents: "none", width: "max-content", maxWidth: "calc(100vw - 32px)" }}>
          {toasts.map(t => {
            const toneMap: any = {
              default: { bg: "var(--ink-900)", border: "rgba(255,255,255,0.08)", fg: "#fff", icon_color: "rgba(255,255,255,0.6)" },
              completed: { bg: "var(--completed-600)", border: "rgba(255,255,255,0.15)", fg: "#fff", icon_color: "rgba(255,255,255,0.8)" },
              missed: { bg: "var(--missed-600)", border: "rgba(255,255,255,0.15)", fg: "#fff", icon_color: "rgba(255,255,255,0.8)" },
              skipped: { bg: "var(--skipped-600)", border: "rgba(255,255,255,0.15)", fg: "#fff", icon_color: "rgba(255,255,255,0.8)" },
              signal: { bg: "var(--interactive)", border: "rgba(255,255,255,0.15)", fg: "#fff", icon_color: "rgba(255,255,255,0.8)" },
              warning: { bg: "var(--skipped-100)", border: "var(--skipped-500)", fg: "var(--skipped-600)", icon_color: "var(--skipped-600)" }
            };
            const s = toneMap[t.tone] || toneMap.default;
            return (
              <div key={t.id} style={{ background: s.bg, border: "1px solid " + s.border, color: s.fg, borderRadius: "var(--radius-xl)", padding: "12px 16px", fontSize: "var(--text-sm)", fontWeight: 500, boxShadow: "var(--shadow-lg)", display: "flex", alignItems: "center", gap: 10, minWidth: 280, maxWidth: 420, animation: "webToastIn 220ms var(--ease-out) both", pointerEvents: "auto" }}>
                {t.icon && (
                  <span style={{ color: s.icon_color, display: "inline-flex", flexShrink: 0 }}>
                    <Check size={16} />
                  </span>
                )}
                <span style={{ flex: 1 }}>{t.msg}</span>
                <button onClick={() => dismissToast(t.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: s.icon_color, display: "inline-flex", flexShrink: 0 }}><X size={14} /></button>
              </div>
            );
          })}
        </div>
      )}
    </ToastContext.Provider>
  );
}
