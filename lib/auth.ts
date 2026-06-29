import { betterAuth } from "better-auth";
import { DB, User } from "./db";
import { logger } from "./logger";
import { headers } from "next/headers";
import { config } from "./config";
import { DEFAULT_TIMEZONE, DEFAULT_REMINDER_MINUTES } from "./constant";
import { getOtpStore } from "./otp-store";
import { createAuthEndpoint, APIError } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import * as z from "zod";

const BETTER_AUTH_SECRET = config.betterAuthSecret;

// Custom database adapter linking Better Auth with our dual-driver DB layer
const customDbAdapter = {
  id: "custom-db-adapter",
  create: async ({ model, data }: { model: string; data: any }) => {
    logger.debug('Auth:Adapter', `Create record for model: ${model}`);
    return await DB.createRecord(model, data);
  },
  findOne: async ({ model, where }: { model: string; where: { field: string; value: any }[] }) => {
    logger.debug('Auth:Adapter', `Find one record for model: ${model}`);
    return await DB.findRecord(model, where);
  },
  findMany: async ({ model, where }: { model: string; where: { field: string; value: any }[] }) => {
    logger.debug('Auth:Adapter', `Find many records for model: ${model}`);
    return await DB.findRecords(model, where);
  },
  update: async ({ model, where, update }: { model: string; where: { field: string; value: any }[]; update: any }) => {
    logger.debug('Auth:Adapter', `Update record for model: ${model}`);
    return await DB.updateRecord(model, where, update);
  },
  delete: async ({ model, where }: { model: string; where: { field: string; value: any }[] }) => {
    logger.debug('Auth:Adapter', `Delete record for model: ${model}`);
    await DB.deleteRecord(model, where);
  },
  updateMany: async ({ model, where, update }: { model: string; where: { field: string; value: any }[]; update: any }) => {
    logger.debug('Auth:Adapter', `Update many records for model: ${model}`);
    return await DB.updateManyRecords(model, where, update);
  },
  deleteMany: async ({ model, where }: { model: string; where: { field: string; value: any }[] }) => {
    logger.debug('Auth:Adapter', `Delete many records for model: ${model}`);
    return await DB.deleteManyRecords(model, where);
  }
};

// Custom credential plugin to support OTP email authentication flow
const credentialsPlugin = () => {
  return {
    id: "custom-credentials",
    endpoints: {
      signInCredentials: createAuthEndpoint("/sign-in/credentials", {
        method: "POST",
        body: z.object({
          email: z.string(),
          code: z.string()
        })
      }, async (ctx) => {
        const { email, code } = ctx.body;
        const lowerEmail = email.toLowerCase();
        
        // 1. Verify OTP code from global store
        const entry = getOtpStore().get(lowerEmail);
        if (!entry || entry.code !== code || entry.expires < Date.now()) {
          logger.warn('Auth:Authorize', `OTP verification failed for: ${email}`);
          throw new APIError("UNAUTHORIZED", { message: "Invalid or expired verification code." });
        }

        // OTP verification succeeded, clean code from store
        getOtpStore().delete(lowerEmail);

        // 2. Retrieve or create User profile
        let user = await DB.findUserByEmail(lowerEmail);
        if (!user) {
          const userName = entry?.name || (lowerEmail === "ayaan@routineflow.app" ? "Ayaan Rahman" : "User");
          const userTz = entry?.timezone || DEFAULT_TIMEZONE;
          user = await DB.createUser(userName, lowerEmail);
          
          // Initialize Settings
          await DB.updateSettings(user.id, {
            timezone: userTz,
            defaultReminderMinutes: DEFAULT_REMINDER_MINUTES,
            notificationPreferences: {
              notifEnabled: true,
              useGlobal: true,
              skipBreaksStreak: false
            }
          });
          logger.info('Auth:Authorize', `New user signed up: ${user.email}`);
        }

        // Seed initial history
        await DB.seedDefaultData(user.id);

        const session = await ctx.context.internalAdapter.createSession(user.id);
        if (!session) {
          throw new APIError("INTERNAL_SERVER_ERROR", { message: "Failed to create session." });
        }

        await setSessionCookie(ctx, {
          session,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            emailVerified: true,
            createdAt: user.createdAt,
            updatedAt: user.createdAt,
            image: user.image || null
          }
        });

        return ctx.json({
          session,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            emailVerified: true,
            createdAt: user.createdAt,
            updatedAt: user.createdAt,
            image: user.image || null
          }
        });
      })
    }
  };
};

export const auth = betterAuth({
  baseURL: config.betterAuthUrl,
  secret: BETTER_AUTH_SECRET,
  database: () => customDbAdapter,
  trustedOrigins: [
    "http://localhost:3000",
    "http://localhost:8081",
  ],
  socialProviders: {
    ...(config.googleClientId && config.googleClientSecret ? {
      google: {
        clientId: config.googleClientId,
        clientSecret: config.googleClientSecret
      }
    } : {})
  },
  plugins: [credentialsPlugin()],

  // Configure session cookie behaviors
  session: {
    expiresIn: 7 * 24 * 60 * 60, // 7 days
    updateAge: 24 * 60 * 60, // 24 hours
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60 // 5 minutes cache
    }
  }
});

// Expose server authentication validation to routes (retains existing contract)
export async function getSessionUser(): Promise<User | null> {
  try {
    const requestHeaders = await headers();

    // First, try Bearer token authentication (for mobile apps)
    const authHeader = requestHeaders.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);

      // Validate token by finding the session
      const session = await DB.findRecord('session', [{ field: 'token', value: token }]);
      if (session && session.expiresAt && new Date(session.expiresAt) > new Date()) {
        const user = await DB.findUserById(session.userId);
        if (user) {
          logger.debug('Auth:Me', `User authenticated via Bearer token: ${user.email}`);
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image || undefined,
            createdAt: new Date(user.createdAt)
          };
        }
      }
      logger.warn('Auth:Me', 'Invalid or expired Bearer token');
      return null;
    }

    // Fall back to cookie-based session auth (for web)
    const session = await auth.api.getSession({
      headers: requestHeaders
    });
    if (!session || !session.user) return null;

    return {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      image: session.user.image || undefined,
      createdAt: new Date(session.user.createdAt)
    };
  } catch (err) {
    logger.debug('Auth:Me', 'Failed to retrieve active session');
    return null;
  }
}
