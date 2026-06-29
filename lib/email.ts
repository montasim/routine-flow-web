import { config } from "./config";

export class EmailConfigurationError extends Error {
  constructor(message = "Email delivery is not configured.") {
    super(message);
    this.name = "EmailConfigurationError";
  }
}

export class EmailDeliveryError extends Error {
  constructor(message = "Email delivery failed.") {
    super(message);
    this.name = "EmailDeliveryError";
  }
}

function getResendConfig() {
  if (!config.resendApiKey || !config.emailFrom) {
    throw new EmailConfigurationError("RESEND_API_KEY and EMAIL_FROM must be configured.");
  }

  return {
    apiKey: config.resendApiKey,
    from: config.emailFrom
  };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendOtpEmail({ to, code, name }: { to: string; code: string; name?: string }) {
  const { apiKey, from } = getResendConfig();
  const recipientName = name?.trim() || "there";
  const safeName = escapeHtml(recipientName);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "User-Agent": "routine-flow/0.1.0"
    },
    body: JSON.stringify({
      from,
      to,
      subject: "Your RoutineFlow verification code",
      text: [
        `Hi ${recipientName},`,
        "",
        `Your RoutineFlow verification code is ${code}.`,
        "This code expires in 10 minutes.",
        "",
        "If you did not request this code, you can ignore this email."
      ].join("\n"),
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.5;color:#171717">
          <p>Hi ${safeName},</p>
          <p>Your RoutineFlow verification code is:</p>
          <p style="font-size:28px;font-weight:700;letter-spacing:6px;margin:24px 0">${code}</p>
          <p>This code expires in 10 minutes.</p>
          <p style="color:#6b7280">If you did not request this code, you can ignore this email.</p>
        </div>
      `
    })
  });

  if (!response.ok) {
    let details = "";
    try {
      details = await response.text();
    } catch {
      details = "";
    }

    throw new EmailDeliveryError(`Resend request failed with status ${response.status}${details ? `: ${details}` : ""}`);
  }
}
