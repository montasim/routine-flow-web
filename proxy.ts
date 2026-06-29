import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ALLOWED_ORIGINS = [
  "http://localhost:8081",
  "http://localhost:3000",
];

export function proxy(request: NextRequest) {
  // Only process requests to API endpoints
  if (request.nextUrl.pathname.startsWith("/api/")) {
    const origin = request.headers.get("origin");

    // Verify if origin is explicitly allowed or is a local development address
    const isAllowed = origin && (
      ALLOWED_ORIGINS.includes(origin) ||
      origin.startsWith("http://localhost:") ||
      origin.startsWith("http://127.0.0.1:")
    );

    // Handle Preflight (OPTIONS) request
    if (request.method === "OPTIONS") {
      const response = new NextResponse(null, { status: 204 });
      if (isAllowed && origin) {
        response.headers.set("Access-Control-Allow-Origin", origin);
        response.headers.set("Access-Control-Allow-Credentials", "true");
      }
      response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
      response.headers.set(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, Cookie, Set-Cookie, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version"
      );
      response.headers.set("Access-Control-Max-Age", "86400"); // cache preflight for 24 hours
      return response;
    }

    // For standard requests, append CORS headers to the response
    const response = NextResponse.next();
    if (isAllowed && origin) {
      response.headers.set("Access-Control-Allow-Origin", origin);
      response.headers.set("Access-Control-Allow-Credentials", "true");
    }
    return response;
  }

  return NextResponse.next();
}

// Intercept all API routes
export const config = {
  matcher: "/api/:path*",
};
