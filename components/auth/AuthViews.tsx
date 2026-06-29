import React, { useRef } from "react";
import { MARK_SVG } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AuthLayout({ children }: { children: React.ReactNode }) {
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

export function GoogleButton({ onClick, loading, label = "Continue with Google" }: { onClick: () => void; loading: boolean; label?: string }) {
  return (
    <Button
      variant="outline"
      onClick={onClick}
      disabled={loading}
      className="w-full flex items-center justify-center gap-2.5 py-6 rounded-md font-medium text-base hover:bg-[var(--surface-sunken)] transition-colors border-[1.5px]"
    >
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4" />
        <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853" />
        <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05" />
        <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335" />
      </svg>
      {loading ? "Connecting…" : label}
    </Button>
  );
}

export function Divider({ label = "or" }: { label?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "4px 0" }}>
      <div style={{ flex: 1, height: 1, background: "var(--border-subtle)" }} />
      <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-2xs)", color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "var(--tracking-caps)" }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: "var(--border-subtle)" }} />
    </div>
  );
}

export function OtpInput({ value, onChange, onComplete }: { value: string; onChange: (v: string) => void; onComplete?: (code: string) => void }) {
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
        <Input
          key={i}
          ref={(el) => { inputs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKey(i, e)}
          onPaste={handlePaste}
          className={`w-12 h-14 text-center text-2xl font-mono font-semibold caret-[var(--interactive)] border-[1.5px] ${d ? 'border-[var(--interactive)]' : 'border-[var(--border-default)]'}`}
        />
      ))}
    </div>
  );
}

export function SignInView({ step, email, setEmail, otp, setOtp, loading, googleLoading, error, setError, resendTimer, setStep, sendOtp, verifyOtp, handleGoogle, onGoSignUp }: any) {
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
                <Input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && sendOtp()}
                  className="w-full px-3 py-6 text-base rounded-md border-[1.5px] border-[var(--border-default)] focus-visible:ring-0 focus-visible:border-[var(--interactive)]"
                />
              </div>
              <Button onClick={sendOtp} disabled={loading} className="w-full py-6 mt-2 rounded-md bg-[var(--interactive)] hover:bg-[var(--interactive-hover)] text-white font-semibold text-base shadow-sm">
                {loading ? "Sending..." : "Continue with Email"}
              </Button>
            </div>
            <div style={{ marginTop: 24, textAlign: "center" }}>
              <span style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>Don't have an account? </span>
              <button onClick={onGoSignUp} style={{ fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--interactive)", background: "none", border: "none", padding: 0, cursor: "pointer" }}>Sign up</button>
            </div>
          </>
        ) : (
          <>
            <div style={{ marginBottom: 24 }}>
              <h1 style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-2xl)", fontWeight: 700, letterSpacing: "-0.02em", margin: "0 0 6px" }}>Check your email</h1>
              <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", margin: 0 }}>Enter the 6-digit code sent to <span style={{ fontWeight: 500, color: "var(--text-primary)" }}>{email}</span></p>
            </div>
            {error && <div style={{ background: "var(--missed-100)", color: "var(--missed-600)", fontSize: "var(--text-sm)", padding: "10px 14px", borderRadius: "var(--radius-md)", fontWeight: 500, marginBottom: 20 }}>{error}</div>}
            <OtpInput value={otp} onChange={(v) => { setOtp(v); setError(""); }} onComplete={(c) => verifyOtp(c)} />
            <Button onClick={() => verifyOtp(otp)} disabled={loading || otp.length < 6} className="w-full py-6 mt-6 rounded-md bg-[var(--interactive)] hover:bg-[var(--interactive-hover)] text-white font-semibold text-base shadow-sm">
              {loading ? "Verifying..." : "Verify Code"}
            </Button>
            <div style={{ marginTop: 24, textAlign: "center" }}>
              {resendTimer > 0 ? (
                <span style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>Resend code in {resendTimer}s</span>
              ) : (
                <button onClick={sendOtp} style={{ fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--interactive)", background: "none", border: "none", padding: 0, cursor: "pointer" }}>Resend code</button>
              )}
            </div>
          </>
        )}
      </div>
    </AuthLayout>
  );
}

export function SignUpView({ step, email, setEmail, otp, setOtp, loading, googleLoading, error, setError, resendTimer, setStep, sendOtp, verifyOtp, handleGoogle, onGoSignIn }: any) {
  return (
    <AuthLayout>
      <div style={{ background: "var(--surface-card)", borderRadius: "var(--radius-lg)", padding: "var(--space-8)", boxShadow: "var(--ring-hairline)" }}>
        {step === "entry" ? (
          <>
            <div style={{ marginBottom: 24 }}>
              <h1 style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-2xl)", fontWeight: 700, letterSpacing: "-0.02em", margin: "0 0 6px" }}>Create account</h1>
              <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", margin: 0 }}>Start building better habits today.</p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <GoogleButton onClick={handleGoogle} loading={googleLoading} label="Sign up with Google" />
              <Divider />
              {error && <div style={{ background: "var(--missed-100)", color: "var(--missed-600)", fontSize: "var(--text-sm)", padding: "10px 14px", borderRadius: "var(--radius-md)", fontWeight: 500 }}>{error}</div>}
              <div>
                <Input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && sendOtp()}
                  className="w-full px-3 py-6 text-base rounded-md border-[1.5px] border-[var(--border-default)] focus-visible:ring-0 focus-visible:border-[var(--interactive)]"
                />
              </div>
              <Button onClick={sendOtp} disabled={loading} className="w-full py-6 mt-2 rounded-md bg-[var(--interactive)] hover:bg-[var(--interactive-hover)] text-white font-semibold text-base shadow-sm">
                {loading ? "Sending..." : "Continue with Email"}
              </Button>
            </div>
            <div style={{ marginTop: 24, textAlign: "center" }}>
              <span style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>Already have an account? </span>
              <button onClick={onGoSignIn} style={{ fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--interactive)", background: "none", border: "none", padding: 0, cursor: "pointer" }}>Sign in</button>
            </div>
          </>
        ) : (
          <>
            <div style={{ marginBottom: 24 }}>
              <h1 style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-2xl)", fontWeight: 700, letterSpacing: "-0.02em", margin: "0 0 6px" }}>Verify email</h1>
              <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", margin: 0 }}>Enter the 6-digit code sent to <span style={{ fontWeight: 500, color: "var(--text-primary)" }}>{email}</span></p>
            </div>
            {error && <div style={{ background: "var(--missed-100)", color: "var(--missed-600)", fontSize: "var(--text-sm)", padding: "10px 14px", borderRadius: "var(--radius-md)", fontWeight: 500, marginBottom: 20 }}>{error}</div>}
            <OtpInput value={otp} onChange={(v) => { setOtp(v); setError(""); }} onComplete={(c) => verifyOtp(c)} />
            <Button onClick={() => verifyOtp(otp)} disabled={loading || otp.length < 6} className="w-full py-6 mt-6 rounded-md bg-[var(--interactive)] hover:bg-[var(--interactive-hover)] text-white font-semibold text-base shadow-sm">
              {loading ? "Verifying..." : "Verify Code"}
            </Button>
            <div style={{ marginTop: 24, textAlign: "center" }}>
              {resendTimer > 0 ? (
                <span style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>Resend code in {resendTimer}s</span>
              ) : (
                <button onClick={sendOtp} style={{ fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--interactive)", background: "none", border: "none", padding: 0, cursor: "pointer" }}>Resend code</button>
              )}
            </div>
          </>
        )}
      </div>
    </AuthLayout>
  );
}
