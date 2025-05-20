import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { userId } = await request.json();

  if (!userId) {
    return NextResponse.json({ error: 'User ID required' }, { status: 400 });
  }

  // Anonymize users table
  const { error: updateError } = await supabaseAdmin
    .from('users')
    .update({ email: `anonymous_${userId}@example.com` })
    .eq('id', userId);
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Delete from auth.users (cascades to user_profiles via ON DELETE CASCADE)
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: 'User deleted successfully' }, { status: 200 });
}