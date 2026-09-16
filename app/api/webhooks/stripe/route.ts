import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return NextResponse.json({ error: `Webhook error: ${err.message}` }, { status: 400 });
  }

  // Use the admin client to bypass Row Level Security for backend inserts
  const supabaseAdmin = getSupabaseAdmin();

// app/api/webhooks/stripe/route.ts

if (event.type === 'checkout.session.completed') {
  const session = event.data.object as any;
  const metadata = session.metadata || {};

  // A. Event Registration Handler
  if (metadata.isEventBooking === 'true') {
    try {
      await supabaseAdmin.from('event_registrations').insert({
        event_id: metadata.eventId,
        instructor_id: metadata.instructorId,
        student_name: metadata.studentName,
        parent_name: metadata.parentName,
        parent_email: metadata.parentEmail,
        amount_paid: session.amount_total ? session.amount_total / 100 : 0,
        stripe_session_id: session.id,
        status: 'confirmed',
      });
      console.log(`Event registration saved for ${metadata.studentName}`);
    } catch (err: any) {
      console.error('Error saving event registration:', err.message);
    }
    return NextResponse.json({ received: true });
  }

  // B. Membership Onboarding Handler
  const {
    instructorId,
    studentName,
    parentName,
    parentMobile,
    parentEmail,
    cadence,
    selectedTier,
    joiningFee,
  } = metadata;

  if (!instructorId || !studentName || !parentEmail) {
    console.error('Webhook payload missing required metadata');
    return NextResponse.json({ received: true });
  }

  try {
    const emailInput = parentEmail.trim().toLowerCase();
    const mobileInput = parentMobile ? parentMobile.replace(/\s+/g, '') : '';
    const nameParts = studentName.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : firstName;

    // Search for existing student by instructor and primary parent email first
const { data: existingStudent } = await supabaseAdmin
  .from('students')
  .select('id, joining_fee_paid')
  .eq('instructor_id', instructorId)
  .ilike('student_first_name', firstName)
  .ilike('student_last_name', lastName)
  .eq('parent_email', emailInput)
  .maybeSingle();
  
    let studentId: string;
    const feeWasPaid = Number(joiningFee || 0) > 0;

    if (existingStudent) {
      studentId = existingStudent.id;

      await supabaseAdmin
        .from('students')
        .update({
          parent_name: parentName,
          parent_mobile: mobileInput || undefined,
          joining_fee_paid: existingStudent.joining_fee_paid || feeWasPaid,
          joining_fee_paid_at: feeWasPaid ? new Date().toISOString() : undefined,
          updated_at: new Date().toISOString(),
        })
        .eq('id', studentId);
    } else {
      const { data: newStudent, error: createError } = await supabaseAdmin
        .from('students')
        .insert({
          instructor_id: instructorId,
          student_name: studentName,
          student_first_name: firstName,
          student_last_name: lastName,
          parent_name: parentName,
          parent_email: emailInput,
          parent_mobile: mobileInput,
          joining_fee_paid: feeWasPaid,
          joining_fee_paid_at: feeWasPaid ? new Date().toISOString() : null,
        })
        .select('id')
        .single();

      if (createError || !newStudent) {
        throw new Error(`Failed to insert student record: ${createError?.message}`);
      }

      studentId = newStudent.id;
    }

    const subscriptionId = typeof session.subscription === 'string' ? session.subscription : null;

    // Insert Enrollment Record
    const { error: enrollmentError } = await supabaseAdmin
      .from('enrollments')
      .insert({
        student_id: studentId,
        instructor_id: instructorId,
        tier_id: selectedTier,
        stripe_session_id: session.id,
        stripe_customer_id: typeof session.customer === 'string' ? session.customer : null,
        stripe_subscription_id: subscriptionId,
        payment_cadence: cadence,
        amount_paid: session.amount_total ? session.amount_total / 100 : 0,
        status: 'active',
      });

    if (enrollmentError) {
      console.error('Failed to create enrollment record:', enrollmentError.message);
    } else {
      console.log(`Successfully completed enrollment for student ${studentId}`);
    }
  } catch (err: any) {
    console.error('Database sync error in webhook:', err.message);
    return NextResponse.json({ error: 'Database execution failed' }, { status: 500 });
  }
}

  // 2. Handle subscription natural completion / expiration
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as any;

    try {
      const { error } = await supabaseAdmin
        .from('enrollments')
        .update({
          status: 'completed',
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', subscription.id);

      if (error) {
        console.error(`Failed to update enrollment status for subscription ${subscription.id}:`, error.message);
      } else {
        console.log(`Enrollment marked as completed for subscription ${subscription.id}`);
      }
    } catch (err: any) {
      console.error('Error updating expired subscription in webhook:', err.message);
      return NextResponse.json({ error: 'Database execution failed' }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}