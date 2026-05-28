---
name: nextauth-supabase-setup
description: Triển khai hệ thống xác thực bảo mật cho Next.js App Router sử dụng NextAuth v5 (Auth.js) + Supabase + bcrypt + email OTP qua Resend. Use when user wants to add authentication, replace localStorage auth, implement login/register, or set up role-based access control in a Next.js project.
---

# NextAuth v5 + Supabase Authentication

## Quick Start Checklist

- [ ] Cài đặt dependencies
- [ ] Tạo `src/auth.config.ts` (Edge-safe, không có Node-only imports)
- [ ] Tạo `src/auth.ts` (Full Node.js, import bcrypt + Supabase ở đây)
- [ ] Tạo `src/app/api/auth/[...nextauth]/route.ts`
- [ ] Tạo `middleware.ts` — import từ `auth.config.ts`, **KHÔNG phải từ `auth.ts`**
- [ ] Thêm `AUTH_SECRET` vào `.env.local`
- [ ] Cập nhật Supabase schema
- [ ] Cập nhật UI components

---

## Workflows

### Bước 1 — Cài đặt

```bash
npm install next-auth@beta bcrypt @types/bcrypt resend
```

### Bước 2 — Biến môi trường (`.env.local`)

```env
AUTH_SECRET="<chạy: openssl rand -base64 32>"
NEXT_PUBLIC_SUPABASE_URL="..."
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
RESEND_API_KEY="re_..."         # Nếu dùng xác thực email
```

> ⚠️ **Lỗi thường gặp:** `echo "\nAUTH_SECRET=..."` sẽ in ký tự `\n` ra file thay vì xuống dòng. Dùng `echo -e` hoặc chỉnh tay trong editor.

### Bước 3 — Supabase Schema

```sql
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "password" TEXT,
  ADD COLUMN IF NOT EXISTS "is_verified" BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "verification_otp" TEXT;

-- Đặt is_verified = TRUE cho tất cả user cũ đã migrate
UPDATE "users" SET is_verified = TRUE WHERE is_verified IS NULL;
```

### Bước 4 — Tách config (QUAN TRỌNG NHẤT)

Xem [REFERENCE.md](REFERENCE.md#tách-config) — đây là nguồn gốc gây ra vòng lặp redirect vô tận.

### Bước 5 — Middleware

```ts
// middleware.ts — chỉ import auth.config, KHÔNG import auth.ts
import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
export const { auth } = NextAuth(authConfig);
export default auth((req) => { /* logic redirect theo role */ });
```

### Bước 6 — UI Components (Sidebar, DashboardLayout)

NextAuth v5 lưu tên user trong `session.user.name` (không phải `fullName`). Luôn dùng fallback:

```tsx
const displayName = user.fullName || user.name || 'U';
displayName.charAt(0).toUpperCase(); // An toàn
```

---

## Gotchas & Bẫy thường gặp

Xem chi tiết tại [REFERENCE.md](REFERENCE.md).
