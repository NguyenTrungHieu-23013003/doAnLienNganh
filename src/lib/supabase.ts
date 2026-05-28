import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ Thiếu cấu hình Supabase URL hoặc Key trong .env.local!');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
