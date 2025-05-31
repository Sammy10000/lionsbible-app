// src/utils/supabase/server.ts
import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies(); // Await cookies
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          try {
            return cookieStore.get(name)?.value;
          } catch (error) {
            console.error('Error getting cookie:', error);
            return undefined;
          }
        },
        set(name, value, options) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            console.error('Error setting cookie:', error);
          }
        },
        remove(name, options) {
          try {
            cookieStore.delete({ name, ...options });
          } catch (error) {
            console.error('Error removing cookie:', error);
          }
        },
      },
    }
  );
}

export function createStaticClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}