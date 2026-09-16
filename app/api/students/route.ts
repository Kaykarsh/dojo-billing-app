import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('students')
      .select(`
        id,
        student_name,
        parent_name,
        parent_email,
        parent_mobile,
        joining_fee_paid,
        created_at,
        enrollments (
          id,
          payment_cadence,
          amount_paid,
          status,
          pricing_tiers (
            name,
            billing_interval
          )
        )
      `)
      .eq('instructor_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ students: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}