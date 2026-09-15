import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import Stripe from 'stripe';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('session_id');

  if (!sessionId) {
    return NextResponse.json({ error: 'Missing session_id' }, { status: 400 });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items', 'subscription'],
    });

    const amountTotal = (session.amount_total || 0) / 100;
    const lineItems = session.line_items?.data || [];
    const metadata = session.metadata || {};

    // Default plan name from the main recurring line item if available
    const subscriptionLineItem = lineItems.find((item) => item.price?.recurring);
    let planName = subscriptionLineItem?.description || 'Dojo Membership';
    let recurringRate = 0;
    let billingInterval = 'month';

    if (session.subscription && typeof session.subscription !== 'string') {
      const subscription = session.subscription as Stripe.Subscription;
      const subItem = subscription.items.data[0];

      if (subItem && subItem.price) {
        recurringRate = (subItem.price.unit_amount || 0) / 100;
        billingInterval = subItem.price.recurring?.interval || 'month';
      }
    }

    return NextResponse.json({
      amountPaidToday: amountTotal,
      studentName: metadata.studentName || 'Student',
      parentEmail: session.customer_email || metadata.parentEmail || '',
      cadence: metadata.cadence || 'recurring',
      planName,
      recurringRate,
      billingInterval,
      lineItems: lineItems.map((item) => ({
        description: item.description,
        amount: (item.amount_total || 0) / 100,
      })),
    });
  } catch (err: any) {
    console.error('Error fetching Stripe session:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}