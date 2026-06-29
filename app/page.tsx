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
  SwitchCamera,
  Heart,
  Activity,
  Briefcase,
  Brain,
  DollarSign,
  ChevronLeft,
  Folder,
  BarChart3,
  Pencil,
  Trash2,
  ChevronsUpDown
} from "lucide-react";
import Image from "next/image";
import { authClient } from "@/lib/auth-client";
import { DEFAULT_TIMEZONE, DEFAULT_REMINDER_MINUTES, TIMEZONES, SETTINGS_TIMEZONES, REMINDER_OPTIONS, CATEGORIES } from "@/lib/constant";
import { ConfirmModal } from "@/components/shared/ConfirmModal";

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

const ToastContext = React.createContext<(msg: string, opts?: { tone?: ToastTone; icon?: string; duration?: number }) => void>(() => { });

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
        toast("Google login is not configured. Use email OTP.", { tone: "warning" });
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
    } catch (e) { }
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
        toast("Google signup is not configured. Use email OTP.", { tone: "warning" });
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
        <span style={{ width: 120, fontSize: "var(--text-sm)", color: "var(--text-secondary)", flexShrink: 0 }}>{label}</span>
        <div style={{ flex: 1, height: 6, background: "var(--surface-sunken)", borderRadius: "var(--radius-pill)", overflow: "hidden" }}>
          <div style={{ width: (val * 100) + "%", height: "100%", background: "var(--interactive)", borderRadius: "var(--radius-pill)" }} />
        </div>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-2xs)", color: "var(--text-faint)", width: 30, textAlign: "right", flexShrink: 0 }}>{weight}</span>
      </div>
    );
  }
  return (
    <Card padding="lg" style={{ display: "flex", flexDirection: "column", gap: 18, width: "100%" }}>
      <div style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-xl)", fontWeight: 600 }}>Discipline score</div>
      <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
        <ProgressRing value={score} size={120} thickness={10} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
          <Factor label="Completion rate" weight="40%" val={0.86} />
          <Factor label="Consistency" weight="30%" val={0.81} />
          <Factor label="Delay penalty" weight="20%" val={0.74} />
          <Factor label="Streak bonus" weight="10%" val={0.9} />
        </div>
      </div>
    </Card>
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

// ─── SKELETON LOADERS ───

function OverviewSkeleton() {
  return (
    <>
      <div className="grid gap-2.5 sm:gap-4 mb-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map(i => <div key={i} className="skeleton-box" style={{ height: 104, width: "100%" }} />)}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 24 }}>
        <div className="skeleton-box" style={{ height: 28, width: 200, marginBottom: 4 }} />
        {[1, 2, 3].map(i => <div key={i} className="skeleton-box" style={{ height: 72, width: "100%" }} />)}
      </div>
    </>
  );
}

function RoutinesSkeleton() {
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div className="skeleton-box" style={{ height: 28, width: 140 }} />
        <div className="skeleton-box" style={{ height: 38, width: 120, borderRadius: "var(--radius-md)" }} />
      </div>
      <div className="table-wrap" style={{ background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)" }}>
        <table style={{ width: "100%" }}>
          <thead>
            <tr>
              {[1, 2, 3, 4, 5, 6, 7].map(i => <th key={i}><div className="skeleton-box" style={{ height: 14, width: "60%" }} /></th>)}
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5].map(i => (
              <tr key={i}>
                <td colSpan={7} style={{ padding: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", padding: "12px 24px", gap: 16 }}>
                     <div className="skeleton-box" style={{ height: 20, flex: 1 }} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function CategoriesSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 8 }}>
        <div className="skeleton-box" style={{ height: 38, width: 140, borderRadius: "var(--radius-md)" }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{ background: 'var(--surface-card)', padding: 'var(--space-6)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--ring-hairline)', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="skeleton-box" style={{ width: 48, height: 48, borderRadius: '50%', flexShrink: 0 }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
               <div className="skeleton-box" style={{ height: 20, width: "60%" }} />
               <div className="skeleton-box" style={{ height: 14, width: "40%" }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatisticsSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="skeleton-box" style={{ width: "100%", height: 300 }} />
      <div className="grid gap-2.5 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mt-2">
         {[1, 2, 3, 4].map(i => <div key={i} className="skeleton-box" style={{ height: 104, width: "100%" }} />)}
      </div>
    </div>
  );
}

function LogsSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', gap: 12 }}>
         {[1, 2, 3, 4, 5].map(i => <div key={i} className="skeleton-box" style={{ height: 34, width: 80, borderRadius: "var(--radius-pill)" }} />)}
      </div>
      <div className="table-wrap" style={{ background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)" }}>
        <table style={{ width: "100%" }}>
          <thead>
            <tr>
              {[1, 2, 3, 4, 5, 6].map(i => <th key={i}><div className="skeleton-box" style={{ height: 14, width: "60%" }} /></th>)}
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5, 6, 7].map(i => (
              <tr key={i}>
                <td colSpan={6} style={{ padding: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", padding: "12px 24px", gap: 16 }}>
                     <div className="skeleton-box" style={{ height: 20, flex: 1 }} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 40, maxWidth: 640 }}>
       {[1, 2, 3, 4].map(section => (
         <div key={section} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
               <div className="skeleton-box" style={{ height: 20, width: 150, marginBottom: 6 }} />
               <div className="skeleton-box" style={{ height: 14, width: 250 }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
               {[1, 2].map(field => (
                  <div key={field}>
                     <div className="skeleton-box" style={{ height: 12, width: 80, marginBottom: 8 }} />
                     <div className="skeleton-box" style={{ height: 42, width: "100%" }} />
                  </div>
               ))}
            </div>
         </div>
       ))}
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

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
          borderRadius: "var(--radius-pill)",
          boxShadow: open ? "0 0 0 3px var(--signal-100)" : "none",
          transition: "box-shadow var(--duration-fast) var(--ease-standard)",
          flexShrink: 0,
          display: "inline-flex"
        }}
      >
        <Avatar name={user.name} src={user.image} size={36} />
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

function NewRoutineModal({ onClose, onSave, routine, onAddNewCategory }: { onClose: () => void; onSave: () => void; routine?: Routine; onAddNewCategory?: () => void }) {
  const toast = React.useContext(ToastContext);
  const [title, setTitle] = useState(routine?.title || "");
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(routine?.time || "08:00");
  const [category, setCategory] = useState(routine?.category || "Health");
  const [recurrence, setRecurrence] = useState(routine?.recurrence?.toLowerCase() === "weekly" ? "Weekly" : "Daily");
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
      const isEdit = !!routine;
      const url = isEdit ? `/api/routines/${routine.id}` : "/api/routines";
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
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
            <div style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-2xl)", fontWeight: 700, letterSpacing: "-0.02em" }}>{routine ? "Edit routine" : "New routine"}</div>
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

          <div>
            <label style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: "var(--text-2xs)", textTransform: "uppercase", letterSpacing: "var(--tracking-caps)", color: "var(--text-muted)", marginBottom: 6 }}>Category</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                style={{ width: "100%", height: 42, padding: "0 12px", background: "var(--surface-card)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", fontFamily: "var(--font-text)", fontSize: "var(--text-md)", color: "var(--text-primary)", outline: "none" }}
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              {onAddNewCategory && (
                <button
                  type="button"
                  onClick={onAddNewCategory}
                  style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "none", color: "var(--interactive)", fontSize: "var(--text-sm)", fontWeight: 500, cursor: "pointer", padding: "4px 0", alignSelf: "flex-start" }}
                >
                  <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 18, height: 18, borderRadius: "50%", border: "1.5px solid var(--interactive)" }}>
                    <Plus size={12} strokeWidth={3} />
                  </span>
                  Add custom category...
                </button>
              )}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: "var(--text-2xs)", textTransform: "uppercase", letterSpacing: "var(--tracking-caps)", color: "var(--text-muted)", marginBottom: 6 }}>Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                style={{ width: "100%", height: 42, padding: "0 12px", background: "var(--surface-card)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", fontFamily: "var(--font-text)", fontSize: "var(--text-md)", color: "var(--text-primary)", outline: "none" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: "var(--text-2xs)", textTransform: "uppercase", letterSpacing: "var(--tracking-caps)", color: "var(--text-muted)", marginBottom: 6 }}>Scheduled time</label>
              <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                style={{ width: "100%", height: 42, padding: "0 12px", background: "var(--surface-card)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", fontFamily: "var(--font-text)", fontSize: "var(--text-md)", color: "var(--text-primary)", outline: "none" }}
              />
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
              {saving ? "Saving..." : (routine ? "Save Routine" : "Create Routine")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SETTINGS FORM UTILS & COMPONENTS ───

function initials(name = "") {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "?";
}

function Avatar({
  name = "",
  src,
  size = 36,
  style = {}
}: {
  name?: string;
  src?: string;
  size?: number;
  style?: React.CSSProperties;
}) {
  const PALETTE = ["var(--signal-500)", "var(--completed-600)", "var(--skipped-600)", "var(--ink-700)", "var(--missed-500)"];
  const color = PALETTE[(name.charCodeAt(0) || 0) % PALETTE.length];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        flex: "none",
        borderRadius: "var(--radius-pill)",
        overflow: "hidden",
        background: src ? "var(--surface-sunken)" : color,
        color: "#fff",
        fontFamily: "var(--font-display)",
        fontSize: Math.round(size * 0.4),
        fontWeight: 600,
        letterSpacing: "0.01em",
        userSelect: "none",
        ...style
      }}
    >
      {src ? (
        <img
          src={src}
          alt={name}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover"
          }}
        />
      ) : (
        initials(name)
      )}
    </span>
  );
}

function Card({
  children,
  padding = "md",
  style = {}
}: {
  children: React.ReactNode;
  padding?: "none" | "sm" | "md" | "lg";
  style?: React.CSSProperties;
}) {
  const pads = {
    none: 0,
    sm: "var(--space-5)",
    md: "var(--space-6)",
    lg: "var(--space-8)"
  };
  return (
    <div
      style={{
        background: "var(--surface-card)",
        borderRadius: "var(--radius-lg)",
        padding: pads[padding],
        boxShadow: "var(--ring-hairline)",
        ...style
      }}
    >
      {children}
    </div>
  );
}

function Button({
  children,
  variant = "primary",
  size = "md",
  iconLeft = null,
  iconRight = null,
  fullWidth = false,
  disabled = false,
  type = "button",
  onClick,
  style = {},
  ...rest
}: {
  children?: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  fullWidth?: boolean;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  style?: React.CSSProperties;
  [key: string]: any;
}) {
  const sizes = {
    sm: { height: 32, padding: "0 12px", font: "var(--text-sm)", radius: "var(--radius-sm)", gap: 6 },
    md: { height: 40, padding: "0 16px", font: "var(--text-md)", radius: "var(--radius-md)", gap: 8 },
    lg: { height: 48, padding: "0 22px", font: "var(--text-lg)", radius: "var(--radius-md)", gap: 8 }
  };
  const s = sizes[size] || sizes.md;
  const variants = {
    primary: { background: "var(--interactive)", color: "#fff", border: "1px solid transparent" },
    secondary: { background: "var(--surface-card)", color: "var(--text-primary)", border: "1px solid var(--border-default)" },
    ghost: { background: "transparent", color: "var(--text-primary)", border: "1px solid transparent" },
    danger: { background: "var(--status-missed)", color: "#fff", border: "1px solid transparent" }
  };
  const v = variants[variant] || variants.primary;
  const hoverBg = {
    primary: "var(--interactive-hover)",
    secondary: "var(--surface-sunken)",
    ghost: "var(--surface-sunken)",
    danger: "var(--missed-600)"
  };

  const [hovered, setHovered] = useState(false);

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: s.gap,
        height: s.height,
        padding: s.padding,
        width: fullWidth ? "100%" : "auto",
        fontFamily: "var(--font-text)",
        fontSize: s.font,
        fontWeight: 600,
        letterSpacing: "0.01em",
        lineHeight: 1,
        borderRadius: s.radius,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
        boxShadow: variant === "primary" || variant === "danger" ? "var(--shadow-xs)" : "none",
        transition: "transform var(--duration-fast) var(--ease-standard), background var(--duration-fast) var(--ease-standard), border-color var(--duration-fast) var(--ease-standard)",
        WebkitTapHighlightColor: "transparent",
        ...v,
        ...(hovered && !disabled ? { background: hoverBg[variant] } : {}),
        ...style
      }}
      {...rest}
    >
      {iconLeft && <span style={{ display: "inline-flex" }}>{iconLeft}</span>}
      {children}
      {iconRight && <span style={{ display: "inline-flex" }}>{iconRight}</span>}
    </button>
  );
}

function Tabs({
  items = [],
  value,
  onChange,
  style = {}
}: {
  items?: { value: string; label: string; count?: number }[];
  value: string;
  onChange?: (val: string) => void;
  style?: React.CSSProperties;
}) {
  return (
    <div
      role="tablist"
      style={{
        display: "flex",
        gap: "var(--space-6)",
        borderBottom: "1px solid var(--border-subtle)",
        ...style
      }}
    >
      {items.map(it => {
        const active = it.value === value;
        const [hovered, setHovered] = useState(false);
        return (
          <button
            key={it.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange && onChange(it.value)}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
              position: "relative",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "0 0 12px",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              fontFamily: "var(--font-text)",
              fontSize: "var(--text-md)",
              fontWeight: active ? 600 : 500,
              color: active ? "var(--text-primary)" : hovered ? "var(--text-secondary)" : "var(--text-muted)",
              transition: "color var(--duration-fast) var(--ease-standard)"
            }}
          >
            {it.label}
            {it.count != null && (
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--text-2xs)",
                  color: active ? "var(--interactive)" : "var(--text-faint)"
                }}
              >
                {it.count}
              </span>
            )}
            <span
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: -1,
                height: 2,
                borderRadius: "var(--radius-pill)",
                background: active ? "var(--interactive)" : "transparent",
                transition: "background var(--duration-fast) var(--ease-standard)"
              }}
            />
          </button>
        );
      })}
    </div>
  );
}

function Switch({
  checked = false,
  disabled = false,
  size = "md",
  onChange,
  ariaLabel,
  style = {}
}: {
  checked?: boolean;
  disabled?: boolean;
  size?: "sm" | "md";
  onChange?: (val: boolean) => void;
  ariaLabel?: string;
  style?: React.CSSProperties;
}) {
  const dims = size === "sm" ? {
    w: 36,
    h: 20,
    k: 14
  } : {
    w: 44,
    h: 26,
    k: 20
  };
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => !disabled && onChange && onChange(!checked)}
      style={{
        position: "relative",
        width: dims.w,
        height: dims.h,
        flex: "none",
        padding: 0,
        border: "none",
        borderRadius: "var(--radius-pill)",
        background: checked ? "var(--interactive)" : "var(--paper-300)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "background var(--duration-base) var(--ease-standard)",
        WebkitTapHighlightColor: "transparent",
        ...style
      }}
    >
      <span
        style={{
          position: "absolute",
          top: "50%",
          left: checked ? dims.w - dims.k - 3 : 3,
          width: dims.k,
          height: dims.k,
          transform: "translateY(-50%)",
          background: "#fff",
          borderRadius: "var(--radius-pill)",
          boxShadow: "var(--shadow-sm)",
          transition: "left var(--duration-base) var(--ease-standard)"
        }}
      />
    </button>
  );
}

function Input({
  label,
  value,
  defaultValue,
  placeholder,
  type = "text",
  leading = null,
  trailing = null,
  hint,
  error,
  disabled = false,
  fullWidth = true,
  onChange,
  style = {},
  ...rest
}: {
  label?: string;
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  type?: string;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  hint?: string;
  error?: string;
  disabled?: boolean;
  fullWidth?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  style?: React.CSSProperties;
  [key: string]: any;
}) {
  const [focused, setFocused] = useState(false);
  const borderColor = error ? "var(--status-missed)" : focused ? "var(--interactive)" : "var(--border-default)";
  return (
    <label
      style={{
        display: "block",
        width: fullWidth ? "100%" : "auto",
        ...style
      }}
    >
      {label && (
        <span
          style={{
            display: "block",
            fontFamily: "var(--font-text)",
            fontSize: "var(--text-sm)",
            fontWeight: 500,
            color: "var(--text-secondary)",
            marginBottom: "var(--space-3)"
          }}
        >
          {label}
        </span>
      )}
      <span
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-3)",
          height: 42,
          padding: "0 12px",
          background: disabled ? "var(--surface-sunken)" : "var(--surface-card)",
          border: `1px solid ${borderColor}`,
          borderRadius: "var(--radius-md)",
          boxShadow: focused ? "var(--ring-focus)" : "none",
          transition: "border-color var(--duration-fast) var(--ease-standard), box-shadow var(--duration-fast) var(--ease-standard)"
        }}
      >
        {leading && (
          <span
            style={{
              display: "inline-flex",
              color: "var(--text-muted)"
            }}
          >
            {leading}
          </span>
        )}
        <input
          type={type}
          value={value}
          defaultValue={defaultValue}
          placeholder={placeholder}
          disabled={disabled}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            flex: 1,
            minWidth: 0,
            border: "none",
            outline: "none",
            background: "transparent",
            fontFamily: "var(--font-text)",
            fontSize: "var(--text-md)",
            color: "var(--text-primary)"
          }}
          {...rest}
        />
        {trailing && (
          <span
            style={{
              display: "inline-flex",
              color: "var(--text-muted)"
            }}
          >
            {trailing}
          </span>
        )}
      </span>
      {(hint || error) && (
        <span
          style={{
            display: "block",
            fontFamily: "var(--font-text)",
            fontSize: "var(--text-xs)",
            color: error ? "var(--status-missed)" : "var(--text-muted)",
            marginTop: "var(--space-2)"
          }}
        >
          {error || hint}
        </span>
      )}
    </label>
  );
}

function Select({
  label,
  value,
  defaultValue,
  options = [],
  disabled = false,
  fullWidth = true,
  onChange,
  style = {},
  ...rest
}: {
  label?: string;
  value?: string;
  defaultValue?: string;
  options?: (string | { value: string; label: string })[];
  disabled?: boolean;
  fullWidth?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  style?: React.CSSProperties;
  [key: string]: any;
}) {
  const [focused, setFocused] = useState(false);
  const opts = options.map(o => typeof o === "string" ? { value: o, label: o } : o);
  return (
    <label
      style={{
        display: "block",
        width: fullWidth ? "100%" : "auto",
        ...style
      }}
    >
      {label && (
        <span
          style={{
            display: "block",
            fontFamily: "var(--font-text)",
            fontSize: "var(--text-sm)",
            fontWeight: 500,
            color: "var(--text-secondary)",
            marginBottom: "var(--space-3)"
          }}
        >
          {label}
        </span>
      )}
      <span
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          height: 42,
          background: disabled ? "var(--surface-sunken)" : "var(--surface-card)",
          border: `1px solid ${focused ? "var(--interactive)" : "var(--border-default)"}`,
          borderRadius: "var(--radius-md)",
          boxShadow: focused ? "var(--ring-focus)" : "none",
          transition: "border-color var(--duration-fast) var(--ease-standard), box-shadow var(--duration-fast) var(--ease-standard)"
        }}
      >
        <select
          value={value}
          defaultValue={defaultValue}
          disabled={disabled}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            appearance: "none",
            WebkitAppearance: "none",
            flex: 1,
            height: "100%",
            padding: "0 36px 0 12px",
            border: "none",
            outline: "none",
            background: "transparent",
            fontFamily: "var(--font-text)",
            fontSize: "var(--text-md)",
            color: "var(--text-primary)",
            cursor: disabled ? "not-allowed" : "pointer"
          }}
          {...rest}
        >
          {opts.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          style={{
            position: "absolute",
            right: 12,
            pointerEvents: "none",
            color: "var(--text-muted)"
          }}
        >
          <path
            d="M6 9l6 6 6-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </label>
  );
}

function Row({
  label,
  sub,
  control,
  last = false
}: {
  label: string;
  sub?: string;
  control: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 0", borderBottom: last ? "none" : "1px solid var(--border-subtle)", flexWrap: "wrap" }}>
      <div style={{ flex: 1, minWidth: 120 }}>
        <div style={{ fontSize: "var(--text-md)", fontWeight: 500 }}>{label}</div>
        {sub && <div style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", marginTop: 2 }}>{sub}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{control}</div>
    </div>
  );
}

// ─── CATEGORIES CHILD COMPONENTS ───

export interface CategoryItem {
  name: string;
  icon: string;
  routines: number;
  rate: string;
  top: string;
}

function getIconComponent(name: string, size = 24) {
  switch (name) {
    case 'heart': return <Heart size={size} />;
    case 'activity': return <Activity size={size} />;
    case 'briefcase': return <Briefcase size={size} />;
    case 'brain': return <Brain size={size} />;
    case 'dollar-sign': return <DollarSign size={size} />;
    default: return <Activity size={size} />;
  }
}

function CategoriesView({ onBack, onAddNew, onSelectCategory }: { onBack: () => void; onAddNew: () => void; onSelectCategory: (c: CategoryItem) => void }) {
  const toast = React.useContext(ToastContext);
  const [confirmDelete, setConfirmDelete] = useState<CategoryItem | null>(null);
  const [categories, setCategories] = useState<CategoryItem[]>([
    { name: 'Health', icon: 'heart', routines: 2, rate: '85%', top: 'Morning Walk' },
    { name: 'Fitness', icon: 'activity', routines: 3, rate: '92%', top: 'Morning Gym' },
    { name: 'Work', icon: 'briefcase', routines: 5, rate: '74%', top: 'Deep work block' },
    { name: 'Mind', icon: 'brain', routines: 2, rate: '61%', top: 'Language practice' },
  ]);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 8 }}>
        <button
          onClick={onAddNew}
          className="hover:bg-[var(--interactive-hover)] active:scale-[0.97] transition-all flex items-center gap-1 cursor-pointer"
          style={{ height: 38, background: "var(--interactive)", color: "#fff", padding: "0 14px", borderRadius: "var(--radius-md)", fontWeight: 600, border: "none", fontSize: "var(--text-sm)" }}
        >
          <Plus size={16} /> New Category
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {categories.map(c => (
          <div key={c.name} onClick={() => onSelectCategory(c)} className="group hover:scale-[1.01] transition-transform cursor-pointer relative" style={{ background: 'var(--surface-card)', padding: 'var(--space-6)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--ring-hairline)', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--surface-sunken)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--interactive)' }}>
              {getIconComponent(c.icon, 24)}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 'var(--text-lg)', color: 'var(--text-primary)' }}>{c.name}</div>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginTop: 4 }}>{c.routines} routines · Top: {c.top}</div>
            </div>
            <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onAddNew(); 
                  toast(`Editing category "${c.name}"`, { tone: 'default' });
                }} 
                className="hover:text-[var(--interactive)] text-[var(--text-muted)] transition-colors p-1 bg-transparent border-none cursor-pointer flex items-center justify-center" 
                title="Edit category"
              >
                <Pencil size={18} />
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmDelete(c);
                }} 
                className="hover:text-[var(--missed-600)] text-[var(--text-muted)] transition-colors p-1 bg-transparent border-none cursor-pointer flex items-center justify-center" 
                title="Delete category"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>
      {confirmDelete && (
        <ConfirmModal
          config={{ icon: "trash", title: "Delete Category?", body: `Are you sure you want to delete the category "${confirmDelete.name}"? All routines inside it will be uncategorized.`, confirmLabel: "Delete", confirmTone: "danger" }}
          onConfirm={() => {
             setCategories(prev => prev.filter(x => x.name !== confirmDelete.name));
             toast("Category deleted.", { tone: 'default' });
             setConfirmDelete(null);
          }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

function AddCategoryModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("dollar-sign");
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(22,24,29,0.5)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: 'var(--surface-card)', padding: 'var(--space-8)', borderRadius: 'var(--radius-xl)', width: 'min(400px, 90vw)', boxShadow: 'var(--shadow-pop)', animation: 'modalIn 180ms var(--ease-out) both' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 600, marginBottom: 20 }}>New Category</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-caps)', color: 'var(--text-muted)', marginBottom: 6 }}>Category Name</div>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Finances" style={{ width: "100%", height: 42, padding: "0 12px", background: "var(--surface-card)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", fontFamily: "var(--font-text)", fontSize: "var(--text-md)", color: "var(--text-primary)", outline: "none" }} />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-caps)', color: 'var(--text-muted)', marginBottom: 6 }}>Icon</div>
            <select value={icon} onChange={e => setIcon(e.target.value)} style={{ width: "100%", height: 42, padding: "0 12px", background: "var(--surface-card)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", fontFamily: "var(--font-text)", fontSize: "var(--text-md)", color: "var(--text-primary)", outline: "none" }}>
              <option value="dollar-sign">Dollar Sign</option>
              <option value="briefcase">Briefcase</option>
              <option value="heart">Heart</option>
              <option value="brain">Brain</option>
              <option value="activity">Activity</option>
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          <button onClick={onClose} className="hover:bg-[var(--surface-sunken)]" style={{ flex: 1, height: 40, border: "1px solid var(--border-default)", background: "var(--surface-card)", borderRadius: "var(--radius-md)", fontWeight: 600, fontSize: "var(--text-md)", cursor: "pointer", color: "var(--text-primary)", transition: "background var(--duration-fast) var(--ease-standard)" }}>Cancel</button>
          <button onClick={onClose} className="hover:opacity-90" style={{ flex: 1, height: 40, background: "var(--interactive)", color: "#fff", border: "none", borderRadius: "var(--radius-md)", fontWeight: 600, fontSize: "var(--text-md)", cursor: "pointer", boxShadow: "var(--shadow-xs)" }}>Save Category</button>
        </div>
      </div>
    </div>
  );
}

function CategoryDetailView({ category, onBack, routines }: { category: CategoryItem; onBack: () => void; routines: Routine[] }) {
  const catRoutines = routines.filter(r => r.category === category.name);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 8 }}>
        <button onClick={() => {
          if (window.confirm("Are you sure you want to delete this category?")) {
            onBack();
          }
        }} style={{ background: 'none', border: 'none', color: 'var(--missed-600)', cursor: 'pointer' }}>
          <Trash2 size={20} />
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--surface-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--interactive)', boxShadow: 'var(--shadow-sm)' }}>
          {getIconComponent(category.icon, 32)}
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 700 }}>{category.name}</div>
          <div style={{ fontSize: 'var(--text-md)', color: 'var(--text-secondary)' }}>Category statistics</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
        <MetricTile label="Completion Rate" value={category.rate} tone="completed" />
        <MetricTile label="Best Streak" value="12" unit="Days" />
        <MetricTile label="Routines" value={catRoutines.length.toString()} />
        <MetricTile label="Time Spent" value="14h" unit="20m" />
      </div>

      <div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-caps)', color: 'var(--text-muted)', marginBottom: 16 }}>Routines in Category</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {catRoutines.map(r => (
            <OccurrenceRow key={r.id} id={r.id} time={r.time} title={r.title} category={r.category} status={r.active ? "Pending" : "Completed"} onComplete={() => { }} onSkip={() => { }} />
          ))}
          {catRoutines.length === 0 && <div style={{ color: 'var(--text-muted)' }}>No routines found in this category.</div>}
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
  const [confirmDeleteRoutine, setConfirmDeleteRoutine] = useState<Routine | null>(null);
  const [confirmEditRoutine, setConfirmEditRoutine] = useState<Routine | null>(null);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryItem | null>(null);
  const [showNewRoutine, setShowNewRoutine] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);

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

  async function handleSaveSettings(updates: {
    displayName?: string;
    timezone?: string;
    defaultReminderMinutes?: number;
    notificationPreferences?: {
      notifEnabled: boolean;
      useGlobal: boolean;
      skipBreaksStreak: boolean;
    };
  }) {
    try {
      const res = await fetch("/api/auth/me", {
        cache: "no-store",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        toast("Settings updated.", { tone: "signal" });
      } else {
        toast("Failed to update settings.", { tone: "warning" });
      }
    } catch (e) {
      toast("Connection error saving settings.", { tone: "warning" });
    }
  }

  async function triggerSignOut() {
    try {
      await authClient.signOut();
      onSignOut();
    } catch (e) { }
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

  const pageTitle: any = { overview: "Overview", categories: "Categories", statistics: "Statistics", routines: "Routines", logs: "Logs", exports: "Exports", settings: "Settings" }[nav];
  const NAV_ITEMS = [
    { id: "overview", label: "Overview", icon: <LayoutDashboard size={18} /> },
    { id: "categories", label: "Categories", icon: <Folder size={18} /> },
    { id: "statistics", label: "Statistics", icon: <BarChart3 size={18} /> },
    { id: "routines", label: "Routines", icon: <Repeat size={18} /> },
    { id: "logs", label: "Logs", icon: <List size={18} /> },
    { id: "exports", label: "Exports", icon: <Download size={18} /> }
  ];



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
      <div className="app">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="brand">
            <div style={{ width: 30, height: 30, flexShrink: 0, overflow: "hidden", borderRadius: 7, lineHeight: 0 }}>
              {MARK_SVG}
            </div>
            <span className="brand-name">Routine<span className="brand-flow">Flow</span></span>
          </div>
          {NAV_ITEMS.map(n => (
            <button key={n.id} className={'nav-btn' + (nav === n.id ? ' active' : '')} onClick={() => { setNav(n.id); if (n.id === 'categories') setSelectedCategory(null); }}>
              {n.icon}
              {n.label}
            </button>
          ))}
          <div className="nav-foot">
            <button className={'nav-btn' + (nav === 'settings' ? ' active' : '')} onClick={() => setNav("settings")}>
              <Settings size={18} />Settings
            </button>
          </div>
        </aside>

        {/* Main Workspace Area */}
        <main className="main-area">
          {/* Tablet Top Header Navigation */}
          <div className="mobile-topnav">
            {[...NAV_ITEMS, { id: "settings", label: "Settings", icon: <Settings size={16} /> }].map(n => (
              <button key={n.id} className={'mobile-topnav-btn' + (nav === n.id ? ' active' : '')} onClick={() => { setNav(n.id); if (n.id === 'categories') setSelectedCategory(null); }}>
                {n.icon}
                {n.label}
              </button>
            ))}
          </div>

          {/* Sticky Topbar */}
          <div className="topbar">
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 28, height: 28, flexShrink: 0, overflow: "hidden", borderRadius: 6, lineHeight: 0, display: "var(--brand-in-topbar, none)" }}>
                {MARK_SVG}
              </div>
              <div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-2xs)", textTransform: "uppercase", letterSpacing: "var(--tracking-caps)", color: "var(--text-muted)" }}>RoutineFlow</div>
                <div className="topbar-title" style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-2xl)", fontWeight: 700, letterSpacing: "-0.02em" }}>{pageTitle}</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span className="tzchip">
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
                  <span className="export-btn-label">Export .xlsx</span>
                </button>
              )}
              <ProfileMenu user={user} onGoSettings={() => setNav("settings")} onRequestSignOut={() => setConfirmSignOut(true)} />
            </div>
          </div>

          {/* Content Pane */}
          <div className="content">
            {nav === "overview" && (
              loading ? <OverviewSkeleton /> :
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

            {nav === "statistics" && (
              loading ? <StatisticsSkeleton /> :
              <>
                <div style={{ marginBottom: 22 }}>
                  <div style={{ display: "flex", gap: "var(--space-6)", borderBottom: "1px solid var(--border-subtle)" }}>
                    {[{ value: "week", label: "Weekly" }, { value: "month", label: "Monthly" }, { value: "year", label: "Yearly" }].map(t => {
                      const isActive = (period === "day" ? "week" : period) === t.value;
                      return (
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
                            fontWeight: isActive ? 600 : 500,
                            color: isActive ? "var(--text-primary)" : "var(--text-muted)",
                            transition: "color var(--duration-fast) var(--ease-standard)"
                          }}
                        >
                          {t.label}
                          <span style={{ position: "absolute", left: 0, right: 0, bottom: -1, height: 2, borderRadius: "var(--radius-pill)", background: isActive ? "var(--interactive)" : "transparent" }} />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {(period === "week" || period === "day") && (
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
              loading ? <RoutinesSkeleton /> :
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
                        <tr key={r.id} className="group hover:bg-[var(--surface-sunken)] transition-colors relative">
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
                          <td className="p-2.5 sm:p-3 lg:p-[12px_24px] border-b border-[var(--border-subtle)] relative">
                            <div className="group-hover:opacity-0 transition-opacity">
                              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "var(--text-sm)", color: r.active ? "var(--completed-600)" : "var(--text-muted)", fontWeight: 500 }}>
                                <span style={{ width: 6, height: 6, borderRadius: "50%", background: r.active ? "var(--completed-600)" : "var(--border-default)", display: "inline-block" }} />
                                {r.active ? "Active" : "Paused"}
                              </span>
                            </div>
                            <div className="absolute inset-0 flex items-center justify-end px-4 opacity-0 group-hover:opacity-100 transition-opacity gap-3">
                              <button onClick={() => setConfirmEditRoutine(r)} className="hover:text-[var(--interactive)] text-[var(--text-muted)] transition-colors" title="Edit routine">
                                <Pencil size={18} />
                              </button>
                              <button onClick={() => setConfirmDeleteRoutine(r)} className="hover:text-[var(--missed-600)] text-[var(--text-muted)] transition-colors" title="Delete routine">
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {nav === "logs" && (loading ? <LogsSkeleton /> : <LogsTable logs={logs} />)}

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
              loading ? <SettingsSkeleton /> :
              <div className="settings-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <Card padding="lg">
                    <div style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-xl)", fontWeight: 600, marginBottom: 16 }}>Profile</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
                      <Avatar name={user.name} src={user.image} size={56} />
                      <div>
                        <div style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-lg)", fontWeight: 600 }}>{user.name}</div>
                        <div style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>{user.email}</div>
                      </div>
                      <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", height: 22, padding: "0 9px", background: "var(--signal-50)", color: "var(--signal-700)", fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", fontWeight: 600, borderRadius: "var(--radius-pill)" }}>PRO</span>
                    </div>
                    <Row
                      label="Display name"
                      control={
                        <Input
                          value={displayName}
                          onChange={e => setDisplayName(e.target.value)}
                          onBlur={() => handleSaveSettings({ displayName })}
                          style={{ width: "min(220px, 100%)" }}
                        />
                      }
                    />
                    <Row
                      label="Email"
                      control={
                        <Input
                          value={user.email}
                          disabled
                          style={{ width: "min(220px, 100%)" }}
                        />
                      }
                      last
                    />
                    <button onClick={() => { setNav('categories'); setSelectedCategory(null); }} className="hover:bg-[var(--surface-sunken)]" style={{ width: '100%', padding: '14px 0', border: 'none', borderTop: '1px solid var(--border-subtle)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ flex: 1, textAlign: 'left', fontSize: 'var(--text-md)', fontWeight: 500, color: 'var(--text-primary)' }}>Manage Categories</div>
                      <ChevronLeft size={16} style={{ transform: 'rotate(180deg)', color: 'var(--text-muted)' }} />
                    </button>
                  </Card>
                  <Card padding="lg">
                    <div style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-xl)", fontWeight: 600, marginBottom: 16 }}>Time</div>
                    <Row
                      label="Timezone"
                      sub="Historical logs always preserve the timezone active at log creation. Changing this only affects future occurrences."
                      control={
                        <Select
                          value={timezone}
                          onChange={e => {
                            const val = e.target.value;
                            setTimezone(val);
                            handleSaveSettings({ timezone: val });
                          }}
                          options={SETTINGS_TIMEZONES}
                          style={{ width: "min(200px, 100%)" }}
                        />
                      }
                      last
                    />
                  </Card>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <Card padding="lg">
                    <div style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-xl)", fontWeight: 600, marginBottom: 16 }}>Reminders</div>
                    <Row
                      label="Notifications"
                      sub="Scheduled at occurrence generation — fires even if app is never opened"
                      control={
                        <Switch
                          checked={notif}
                          onChange={val => {
                            setNotif(val);
                            handleSaveSettings({
                              notificationPreferences: {
                                notifEnabled: val,
                                useGlobal,
                                skipBreaksStreak: skipBreaks
                              }
                            });
                          }}
                          ariaLabel="Notifications"
                        />
                      }
                    />
                    <Row
                      label="Use global reminder"
                      sub="Apply one offset to every routine"
                      control={
                        <Switch
                          checked={useGlobal}
                          onChange={val => {
                            setUseGlobal(val);
                            handleSaveSettings({
                              notificationPreferences: {
                                notifEnabled: notif,
                                useGlobal: val,
                                skipBreaksStreak: skipBreaks
                              }
                            });
                          }}
                          ariaLabel="Global reminder"
                        />
                      }
                    />
                    <Row
                      label="Reminder offset"
                      sub="Minutes before scheduled time"
                      control={
                        <Select
                          value={defaultReminder}
                          onChange={e => {
                            const val = e.target.value;
                            setDefaultReminder(val);
                            handleSaveSettings({ defaultReminderMinutes: Number(val) });
                          }}
                          options={REMINDER_OPTIONS.map(m => ({ value: String(m), label: `${m} min` }))}
                          style={{ width: "min(140px, 100%)" }}
                        />
                      }
                      last
                    />
                  </Card>
                  <Card padding="lg">
                    <div style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-xl)", fontWeight: 600, marginBottom: 16 }}>Streaks</div>
                    <Row
                      label="Skip breaks streak"
                      sub="Off — a skip pauses the streak without resetting it"
                      control={
                        <Switch
                          checked={skipBreaks}
                          onChange={val => {
                            setSkipBreaks(val);
                            handleSaveSettings({
                              notificationPreferences: {
                                notifEnabled: notif,
                                useGlobal,
                                skipBreaksStreak: val
                              }
                            });
                          }}
                          ariaLabel="Skip breaks streak"
                        />
                      }
                      last
                    />
                  </Card>
                  <Card padding="lg">
                    <div style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-xl)", fontWeight: 600, marginBottom: 16 }}>Data</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <button
                        onClick={() => { setExportRange("all"); setConfirmExportXlsx(true); }}
                        className="hover:bg-[var(--surface-sunken)] cursor-pointer flex items-center justify-center gap-2"
                        style={{ height: 40, border: "1.5px solid var(--border-default)", background: "var(--surface-card)", color: "var(--text-primary)", borderRadius: "var(--radius-md)", fontWeight: 600, fontSize: "var(--text-md)", width: "100%", display: "flex", alignItems: "center" }}
                      >
                        <Download size={16} />Export all data (.xlsx)
                      </button>
                      <button
                        onClick={() => setConfirmSignOut(true)}
                        className="hover:bg-[var(--missed-100)] cursor-pointer flex items-center justify-center"
                        style={{ height: 40, border: "none", background: "transparent", color: "var(--missed-600)", borderRadius: "var(--radius-md)", fontWeight: 600, fontSize: "var(--text-md)", width: "100%" }}
                      >
                        Sign out
                      </button>
                      <button
                        className="hover:bg-[var(--missed-100)] cursor-pointer flex items-center justify-center"
                        style={{ height: 40, border: "none", background: "transparent", color: "var(--missed-600)", borderRadius: "var(--radius-md)", fontWeight: 600, fontSize: "var(--text-md)", width: "100%" }}
                      >
                        Delete account and all data
                      </button>
                    </div>
                  </Card>
                </div>
              </div>
            )}

            {nav === 'categories' && !selectedCategory && (
              loading ? <CategoriesSkeleton /> :
              <CategoriesView onBack={() => setNav('settings')} onAddNew={() => setShowAddCategory(true)} onSelectCategory={setSelectedCategory} />
            )}
            {nav === 'categories' && selectedCategory && (
              <CategoryDetailView category={selectedCategory} onBack={() => setSelectedCategory(null)} routines={routines} />
            )}
          </div>

          {/* Mobile Bottom Navigation */}
          <nav className="mobile-bottomnav">
            {NAV_ITEMS.map(n => (
              <button key={n.id} className={'mobile-bottomnav-btn' + (nav === n.id ? ' active' : '')} onClick={() => { setNav(n.id); if (n.id === 'categories') setSelectedCategory(null); }}>
                {n.icon}
                <span>{n.label}</span>
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

      {confirmDeleteRoutine && (
        <ConfirmModal
          config={{ icon: "trash", title: "Delete Routine?", body: `Are you sure you want to delete "${confirmDeleteRoutine.title}"?`, confirmLabel: "Delete", confirmTone: "danger" }}
          onConfirm={async () => {
             try {
               await fetch(`/api/routines/${confirmDeleteRoutine.id}`, { method: 'DELETE' });
               toast("Routine deleted.", { tone: 'default' });
               setRoutines(prev => prev.filter(x => x.id !== confirmDeleteRoutine.id));
             } catch (e) { }
             setConfirmDeleteRoutine(null);
          }}
          onCancel={() => setConfirmDeleteRoutine(null)}
        />
      )}

      {confirmEditRoutine && (
        <ConfirmModal
          config={{ title: "Edit Routine?", body: `Are you sure you want to edit "${confirmEditRoutine.title}"?`, confirmLabel: "Edit", confirmTone: "primary" }}
          onConfirm={() => {
             setEditingRoutine(confirmEditRoutine);
             setConfirmEditRoutine(null);
          }}
          onCancel={() => setConfirmEditRoutine(null)}
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

      {showAddCategory && (
        <AddCategoryModal onClose={() => setShowAddCategory(false)} />
      )}

      {showNewRoutine && (
        <NewRoutineModal
          onClose={() => setShowNewRoutine(false)}
          onAddNewCategory={() => setShowAddCategory(true)}
          onSave={async () => {
            setShowNewRoutine(false);
            await fetchAllData();
          }}
        />
      )}

      {editingRoutine && (
        <NewRoutineModal
          routine={editingRoutine}
          onClose={() => setEditingRoutine(null)}
          onAddNewCategory={() => setShowAddCategory(true)}
          onSave={async () => {
            setEditingRoutine(null);
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
        const res = await fetch("/api/auth/me", { cache: "no-store" });
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
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      const data = await res.json();
      if (data.googleLoginEnabled !== undefined) {
        setGoogleLoginEnabled(data.googleLoginEnabled);
      }
      if (data.authenticated) {
        setUser(data.user);
        setSettings(data.settings);
        setPage("app");
      }
    } catch (e) { }
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
