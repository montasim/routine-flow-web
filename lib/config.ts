export const config = {
  mongodbUri: process.env.MONGODB_URI,
  betterAuthSecret: process.env.BETTER_AUTH_SECRET || process.env.JWT_SECRET || 'fallback-secret-for-better-auth-key-2026',
  betterAuthUrl: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  resendApiKey: process.env.RESEND_API_KEY,
  emailFrom: process.env.EMAIL_FROM,
  cronSecret: process.env.CRON_SECRET,
  isProduction: process.env.NODE_ENV === 'production',
  nodeEnv: process.env.NODE_ENV || 'development'
};
