# NextAuth + Supabase — Reference

## Tách config (Bắt buộc — Ngăn vòng lặp redirect)

**Vấn đề:** Next.js middleware chạy trên **Edge Runtime** — không hỗ trợ `bcrypt` (thư viện C++ native). Nếu middleware import trực tiếp `auth.ts` (chứa bcrypt), Edge sẽ crash ngầm, `req.auth` luôn `null`, mọi request bị redirect về `/login`.

**Giải pháp:** Tách thành 2 file:

```
src/auth.config.ts   ← Edge-safe (callbacks JWT/session, secret)
src/auth.ts          ← Node.js only (Credentials + bcrypt + Supabase)
middleware.ts        ← Import auth.config.ts (KHÔNG phải auth.ts)
```

### `src/auth.config.ts`
```ts
import type { NextAuthConfig } from 'next-auth';
export const authConfig = {
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.role = (user as any).role;
      return token;
    },
    async session({ session, token }) {
      if (token?.sub) session.user.id = token.sub;
      if (token?.role) session.user.role = token.role as string;
      return session;
    },
  },
  session: { strategy: 'jwt' },
  secret: process.env.AUTH_SECRET, // Bắt buộc — Edge cần explicit
} satisfies NextAuthConfig;
```

### `src/auth.ts`
```ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { supabase } from "@/lib/supabase";
import { authConfig } from "./auth.config";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,     // Spread config — callbacks và session được kế thừa
  providers: [
    Credentials({
      async authorize(credentials) {
        const { data: user } = await supabase.from("users")
          .select("*").eq("email", credentials.email).single();
        if (!user?.password) return null;
        if (user.is_verified === false) throw new Error("UNVERIFIED_EMAIL");
        const valid = await bcrypt.compare(credentials.password as string, user.password);
        if (!valid) return null;
        return { id: user.id, email: user.email, name: user.fullName, role: user.role };
      },
    }),
  ],
});
```

---

## Middleware Pattern

```ts
// middleware.ts
import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { NextResponse } from "next/server";

export const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  // Đọc role từ cả 2 vị trí (Edge đôi khi trả về flat object)
  const userRole = (req.auth?.user as any)?.role || (req.auth as any)?.role || "user";

  if (nextUrl.pathname.startsWith("/api/auth")) return NextResponse.next();
  if (nextUrl.pathname.startsWith("/auth")) {
    if (isLoggedIn) return NextResponse.redirect(new URL(`/${userRole}`, nextUrl));
    return NextResponse.next();
  }
  if (!isLoggedIn) return NextResponse.redirect(new URL("/auth/login", nextUrl));
  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
```

---

## TypeScript — Mở rộng kiểu NextAuth

```ts
// src/types/next-auth.d.ts
import NextAuth, { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: { id: string; role: string } & DefaultSession['user'];
  }
  interface User { role: string; }
}
declare module 'next-auth/jwt' {
  interface JWT { role: string; }
}
```

---

## Email OTP Flow (Resend)

### API Register — tạo OTP và gửi mail
```ts
// /api/auth/register/route.ts
const otp = Math.floor(100000 + Math.random() * 900000).toString();
await supabase.from('users').insert({ ..., is_verified: false, verification_otp: otp });

const { Resend } = await import('resend');
const resend = new Resend(process.env.RESEND_API_KEY);
await resend.emails.send({
  from: 'App <onboarding@resend.dev>',  // Domain mặc định của Resend cho dev
  to: email,
  subject: 'Mã OTP Xác Thực',
  html: `Mã OTP của bạn: <strong>${otp}</strong>`,
});
return NextResponse.json({ success: true, email }); // Trả về email để redirect
```

### API Verify OTP
```ts
// /api/auth/verify-otp/route.ts
const { data: user } = await supabase.from('users')
  .select('id, verification_otp, is_verified').eq('email', email).maybeSingle();
if (user?.verification_otp !== otp) return error(400, 'Mã OTP không đúng');
await supabase.from('users').update({ is_verified: true, verification_otp: null }).eq('id', user.id);
```

---

## Bẫy thường gặp

| Lỗi | Nguyên nhân | Cách sửa |
|-----|------------|----------|
| `MissingSecret` | `AUTH_SECRET` không được đọc | Kiểm tra file `.env.local` không có `\n` trước tên biến |
| Vòng lặp redirect về `/login` | Middleware import `auth.ts` kéo theo `bcrypt` vào Edge | Tách `auth.config.ts`, middleware chỉ import config |
| `role` undefined trong middleware | Edge decode JWT phẳng hơn Node.js | Fallback: `(req.auth?.user as any)?.role \|\| (req.auth as any)?.role` |
| `Cannot read properties of undefined (reading 'charAt')` | NextAuth v5 lưu tên trong `user.name`, không phải `user.fullName` | Dùng `user.fullName \|\| user.name \|\| 'U'` |
| `supabase .single() quăng lỗi` | `.single()` throw Error khi không có row | Dùng `.maybeSingle()` cho các truy vấn tìm kiếm có thể rỗng |
| `is_verified` chặn user cũ | Cột mới mặc định FALSE, user cũ không qua verify | Chạy `UPDATE users SET is_verified = TRUE` sau khi thêm cột |
| RLS chặn API | NextAuth token ≠ Supabase token | Tắt RLS, bảo mật ở lớp Next.js middleware |
