import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Thiếu cấu hình Supabase URL hoặc ANON KEY trong .env.local!');
}

// ─────────────────────────────────────────────────────────────────
// Client công khai (anon key) — dùng cho client-side components.
// PHẢI bật RLS trên tất cả tables để bảo vệ dữ liệu!
// ─────────────────────────────────────────────────────────────────
export const supabasePublic = createClient(supabaseUrl, supabaseAnonKey);

// ─────────────────────────────────────────────────────────────────
// Admin client (service role key) — CHỈ dùng trong API routes
// server-side. KHÔNG bao giờ import trong client components!
// Service role key bypass RLS → dùng cẩn thận và có auth check riêng.
// ─────────────────────────────────────────────────────────────────
const adminKey = supabaseServiceKey || supabaseAnonKey;
if (!supabaseServiceKey) {
  console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY chưa được cấu hình! Đang dùng anon key cho server — RLS có thể chặn các thao tác server-side.');
}
export const supabase = createClient(supabaseUrl, adminKey, {
  auth: { persistSession: false },
});
