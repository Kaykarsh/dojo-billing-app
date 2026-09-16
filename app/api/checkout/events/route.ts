import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export async function POST(request: Request) {
  try {
    const { instructorId, eventId, eventTitle, amount, studentName, parentName, parentEmail } = await request.json();

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: parentEmail,
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'aud',
            product_data: {
              name: eventTitle,
              description: `Event Entry for ${studentName}`,
            },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/pay/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/events/${instructorId}`,
      metadata: {
        instructorId,
        eventId,
        studentName,
        parentName,
        parentEmail,
        isEventBooking: 'true',
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('Event Checkout Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}