import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Paths that never require auth.
 */
const PUBLIC_PREFIXES = [
  "/",
  "/login",
  "/signup",
  "/auth",
  "/api/health",
  "/api/auth",
];

/**
 * Authenticated product surfaces. Protected only when Supabase is configured
 * and DEMO_MODE is not enabled — so local/demo builds remain browsable.
 */
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/chat",
  "/employees",
  "/knowledge",
  "/tasks",
  "/calendar",
  "/notes",
  "/files",
  "/email",
  "/automations",
  "/integrations",
  "/devices",
  "/settings",
];

function startsWithAny(pathname: string, prefixes: string[]): boolean {
  return prefixes.some(
    (p) => pathname === p || (p !== "/" && pathname.startsWith(`${p}/`)),
  );
}

function isStaticAsset(pathname: string): boolean {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/assets") ||
    /\.[a-zA-Z0-9]+$/.test(pathname)
  );
}

function isDemoMode(): boolean {
  if (process.env.DEMO_MODE === "true") return true;
  // Without Supabase credentials the product runs in offline demo mode.
  return !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isStaticAsset(pathname) || pathname.startsWith("/api/")) {
    // API routes enforce their own auth; still refresh session cookies.
    if (pathname.startsWith("/api/") && !pathname.startsWith("/api/health")) {
      const { supabaseResponse } = await updateSession(request);
      return supabaseResponse;
    }
    return NextResponse.next();
  }

  const { supabaseResponse, user } = await updateSession(request);

  if (isDemoMode()) {
    return supabaseResponse;
  }

  const isProtected = startsWithAny(pathname, PROTECTED_PREFIXES);
  const isPublic =
    pathname === "/" ||
    startsWithAny(pathname, PUBLIC_PREFIXES.filter((p) => p !== "/"));

  if (isProtected && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && (pathname === "/login" || pathname === "/signup")) {
    const dash = request.nextUrl.clone();
    dash.pathname = "/dashboard";
    return NextResponse.redirect(dash);
  }

  if (isPublic || !isProtected) {
    return supabaseResponse;
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
