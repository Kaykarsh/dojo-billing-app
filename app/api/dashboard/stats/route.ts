import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: instructor } = await supabase
      .from('instructors')
      .select('business_name')
      .eq('id', user.id)
      .single();

    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('amount_paid, payment_cadence, status')
      .eq('instructor_id', user.id);

    let activeCount = 0;
    let pastDueCount = 0;
    let estimatedMonthly = 0;

    enrollments?.forEach((item) => {
      if (item.status === 'active') {
        activeCount += 1;
        if (item.payment_cadence === 'weekly') {
          estimatedMonthly += Number(item.amount_paid || 0) * 4.33;
        } else {
          estimatedMonthly += Number(item.amount_paid || 0) / 3;
        }
      } else if (item.status === 'past_due') {
        pastDueCount += 1;
      }
    });

    return NextResponse.json({
      stats: {
        activeStudentsCount: activeCount,
        pastDueCount,
        monthlyRevenue: Math.round(estimatedMonthly),
        businessName: instructor?.business_name || 'My Dojo',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}