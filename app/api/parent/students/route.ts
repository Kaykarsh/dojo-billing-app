// app/api/parent/students/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !user.email) {
      return NextResponse.json({ students: [] }, { status: 401 });
    }

    const cleanEmail = user.email.trim().toLowerCase();
    const supabaseAdmin = getSupabaseAdmin();

    // Fetch using Admin client to ensure server-side access across parent_email and auth user ID
    const { data, error } = await supabaseAdmin
      .from('students')
      .select('id, student_name, student_first_name, student_last_name')
      .or(`parent_user_id.eq.${user.id},parent_email.ilike.${cleanEmail},parent_email_secondary.ilike.${cleanEmail}`);

    if (error) {
      console.error('Database query error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ students: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}