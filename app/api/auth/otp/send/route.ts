import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { EmailConfigurationError, EmailDeliveryError, sendOtpEmail } from '@/lib/email';
import { getOtpStore } from '@/lib/otp-store';

export async function POST(request: Request) {
  const context = 'Auth:SendOtp';
  try {
    const { email, name, timezone } = await request.json();
    const lowerEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const displayName = typeof name === 'string' ? name.trim() : undefined;
    const userTimezone = typeof timezone === 'string' ? timezone : undefined;

    if (!lowerEmail || !/\S+@\S+\.\S+/.test(lowerEmail)) {
      return NextResponse.json({ success: false, error: 'Valid email address is required' }, { status: 400 });
    }

    // Generate random 6 digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 10 * 60 * 1000; // 10 minutes expiry

    await sendOtpEmail({ to: lowerEmail, code, name: displayName });

    // Save to store only after the email provider accepts the message.
    getOtpStore().set(lowerEmail, { code, expires, name: displayName, timezone: userTimezone });

    logger.info(context, `Verification code email sent to: ${lowerEmail}`);

    return NextResponse.json({ success: true, message: 'Verification code sent to email.' });
  } catch (err) {
    if (err instanceof EmailConfigurationError) {
      logger.error(context, 'OTP email delivery is not configured', err);
      return NextResponse.json({ success: false, error: 'Email delivery is not configured.' }, { status: 503 });
    }

    if (err instanceof EmailDeliveryError) {
      logger.error(context, 'Failed to send OTP email', err);
      return NextResponse.json({ success: false, error: 'Failed to send verification email. Try again shortly.' }, { status: 502 });
    }

    logger.error(context, 'Error processing OTP request', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
