import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { NextResponse } from "next/server";

export const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  // NextAuth v5 Edge JWT decodes token directly sometimes instead of full session
  const userRole = (req.auth?.user as any)?.role || (req.auth as any)?.role || "user";

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
