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

  // 1. Handle successful checkout completion
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
    
    const {
      instructorId,
      studentName,
      parentName,
      parentMobile,
      parentEmail,
      cadence,
      selectedTier,
      joiningFee,
      initialDeposit,
    } = metadata;

    if (!instructorId || !studentName || !parentEmail) {
      console.error('Webhook payload missing required metadata');
      return NextResponse.json({ received: true });
    }

    try {
      // Identity Resolution & Deduplication Logic
      const emailInput = parentEmail.trim().toLowerCase();
      const mobileInput = parentMobile ? parentMobile.replace(/\s+/g, '') : '';
      const nameParts = studentName.trim().split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : firstName;

      // Search for an existing student under this instructor using admin client
      const { data: existingStudent } = await supabaseAdmin
        .from('students')
        .select('id, joining_fee_paid')
        .eq('instructor_id', instructorId)
        .ilike('student_last_name', lastName)
        .or(
          `parent_email.eq.${emailInput},` +
          `parent_email_secondary.eq.${emailInput}` +
          (mobileInput ? `,parent_mobile.eq.${mobileInput},parent_mobile_secondary.eq.${mobileInput}` : '')
        )
        .maybeSingle();

      let studentId: string;
      const feeWasPaid = Number(joiningFee || 0) > 0;

      if (existingStudent) {
        studentId = existingStudent.id;

        // Update secondary contact info and join fee status
        await supabaseAdmin
          .from('students')
          .update({
            parent_name: parentName,
            parent_email_secondary: emailInput,
            parent_mobile_secondary: mobileInput,
            joining_fee_paid: existingStudent.joining_fee_paid || feeWasPaid,
            joining_fee_paid_at: feeWasPaid ? new Date().toISOString() : undefined,
            updated_at: new Date().toISOString(),
          })
          .eq('id', studentId);
      } else {
        // Create new student profile via admin client
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

      // Insert Enrollment Record via admin client
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

      // Handle commitment weeks subscription schedule
      if (subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const commitmentWeeks = Number(subscription.metadata?.commitmentWeeks || 0);

        if (commitmentWeeks > 0) {
          const schedule = await stripe.subscriptionSchedules.create({
            from_subscription: subscriptionId,
          });

          const startDate = schedule.phases[0].start_date;
          const endDate = startDate + commitmentWeeks * 7 * 24 * 60 * 60;

          await stripe.subscriptionSchedules.update(schedule.id, {
            end_behavior: 'cancel',
            phases: [
              {
                start_date: startDate,
                end_date: endDate,
                items: schedule.phases[0].items.map((item) => ({
                  price: typeof item.price === 'string' ? item.price : item.price.id,
                  quantity: item.quantity,
                })),
              },
            ],
          });
        }
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