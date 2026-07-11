import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { NextResponse } from "next/server";

export const { auth } = NextAuth(authConfig);

// Rate Limit in-memory database (Map)
const rateLimitMap = new Map<string, { count: number; lastReset: number }>();
const RATE_LIMIT_CLEANUP_INTERVAL = 10 * 60 * 1000;
let lastCleanup = Date.now();

function checkRateLimit(ip: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  
  // Dọn dẹp cache rác mỗi 10 phút để tránh tràn RAM
  if (now - lastCleanup > RATE_LIMIT_CLEANUP_INTERVAL) {
    rateLimitMap.clear();
    lastCleanup = now;
  } else if (rateLimitMap.size > 10000) {
    // Evict oldest 50% if map grows too large to prevent memory exhaustion attack
    const keysToDelete = Array.from(rateLimitMap.keys()).slice(0, 5000);
    for (const key of keysToDelete) rateLimitMap.delete(key);
  }

  const record = rateLimitMap.get(ip);
  if (!record) {
    rateLimitMap.set(ip, { count: 1, lastReset: now });
    return true;
  }
  if (now - record.lastReset > windowMs) {
    record.count = 1;
    record.lastReset = now;
    return true;
  }
  if (record.count >= limit) {
    return false;
  }
  record.count += 1;
  return true;
}

export default auth((req) => {
  const { nextUrl } = req;
  const ip = (req as unknown as { ip?: string }).ip || req.headers.get("x-forwarded-for") || "unknown";

  // 1. Chống Spam Đăng Ký (Bảo vệ Token Email) -> Giới hạn: 3 lần / 10 phút
  if (nextUrl.pathname === "/api/auth/register") {
    if (!checkRateLimit(ip + "_register", 3, 10 * 60 * 1000)) {
      return new NextResponse(JSON.stringify({ error: "Rate limit: Bạn đã đăng ký quá nhiều lần. Vui lòng quay lại sau 10 phút." }), { status: 429, headers: { "Content-Type": "application/json" } });
    }
  }

  // 2. Chống Spam Phân Tích AI (Bảo vệ Groq Token) -> Giới hạn: 5 lần / 1 phút
  if (nextUrl.pathname === "/api/suggestions") {
    if (!checkRateLimit(ip + "_ai", 5, 60 * 1000)) {
      return new NextResponse(JSON.stringify({ error: "Rate limit: Gửi yêu cầu AI quá nhanh. Vui lòng nghỉ 1 phút." }), { status: 429, headers: { "Content-Type": "application/json" } });
    }
  }

  const isLoggedIn = !!req.auth;
  // NextAuth v5 Edge JWT decodes token directly sometimes instead of full session
  const userRole = (req.auth?.user as { role?: string } | undefined)?.role || (req.auth as { role?: string } | undefined)?.role || "user";

  const isApiAuthRoute = nextUrl.pathname.startsWith("/api/auth");
  const isAuthRoute = nextUrl.pathname.startsWith("/auth"); // Bao gồm /auth/login, /auth/register, /auth/verify

  if (isApiAuthRoute) return NextResponse.next();

  if (isAuthRoute) {
    if (isLoggedIn) {
      if (userRole === "admin") return NextResponse.redirect(new URL("/admin", nextUrl));
      if (userRole === "coach") return NextResponse.redirect(new URL("/coach", nextUrl));
      return NextResponse.redirect(new URL("/user", nextUrl));
    }
    return NextResponse.next();
  }

  if (nextUrl.pathname === "/") {
    if (isLoggedIn) {
      if (userRole === "admin") return NextResponse.redirect(new URL("/admin", nextUrl));
      if (userRole === "coach") return NextResponse.redirect(new URL("/coach", nextUrl));
      return NextResponse.redirect(new URL("/user", nextUrl));
    }
    return NextResponse.redirect(new URL("/auth/login", nextUrl));
  }

  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/auth/login", nextUrl));
  }

  if (nextUrl.pathname.startsWith("/admin") && userRole !== "admin") return NextResponse.redirect(new URL("/auth/login", nextUrl));
  if (nextUrl.pathname.startsWith("/coach") && userRole !== "coach") return NextResponse.redirect(new URL("/auth/login", nextUrl));
  if (nextUrl.pathname.startsWith("/user") && userRole !== "user") return NextResponse.redirect(new URL("/auth/login", nextUrl));

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
