import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { config } from '@/lib/config';

// Global OTP store helper
if (!(global as any).otpStore) {
  (global as any).otpStore = new Map<string, { code: string; expires: number; name?: string; timezone?: string }>();
}
const otpStore = (global as any).otpStore;

export async function POST(request: Request) {
  const context = 'Auth:SendOtp';
  try {
    const { email, name, timezone } = await request.json();

    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      return NextResponse.json({ success: false, error: 'Valid email address is required' }, { status: 400 });
    }

    // Generate random 6 digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 10 * 60 * 1000; // 10 minutes expiry

    // Save to store
    otpStore.set(email.toLowerCase(), { code, expires, name, timezone });

    // Format console logging for developer
    logger.info(context, `┌────────────────────────────────────────────────────────┐`);
    logger.info(context, `│ OTP CODE GENERATED FOR: ${email.toLowerCase().padEnd(31)} │`);
    logger.info(context, `│ VERIFICATION CODE: ${code.bold ? code.bold : code}                                  │`);
    logger.info(context, `└────────────────────────────────────────────────────────┘`);

    // In non-production, we can return the code in the response so it is easy to copy/paste from the UI or tests
    const responseData: any = { success: true, message: 'Verification code sent.' };
    if (!config.isProduction) {
      responseData.devOtp = code;
    }

    return NextResponse.json(responseData);
  } catch (err) {
    logger.error(context, 'Error processing OTP request', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
