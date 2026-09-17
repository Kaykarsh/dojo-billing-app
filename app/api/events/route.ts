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
      .from('events')
      .select('*')
      .eq('instructor_id', user.id)
      .order('event_date', { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ events: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      amount,
      event_date,
      deadline_date,
      description,
      location,
      capacity,
      event_type,
      has_waiver,
      waiver_text,
      form_fields,
    } = body;

    const { data, error } = await supabase
      .from('events')
      .insert({
        instructor_id: user.id,
        title,
        amount: Number(amount),
        event_date,
        deadline_date: deadline_date || null,
        description: description || null,
        location: location || null,
        capacity: capacity ? Number(capacity) : null,
        event_type: event_type || 'Tournament',
        has_waiver: Boolean(has_waiver),
        waiver_text: waiver_text || null,
        form_fields: form_fields || [], // Stored directly as JSONB array
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ event: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}