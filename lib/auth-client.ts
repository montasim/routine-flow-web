import { createAuthClient } from "better-auth/react";
import { config } from "./config";

export const authClient = createAuthClient({
  // BaseURL is automatically resolved to the current origin on the client,
  // but we can specify it explicitly for server-side fetches.
  baseURL: typeof window !== "undefined" ? undefined : config.betterAuthUrl
});
