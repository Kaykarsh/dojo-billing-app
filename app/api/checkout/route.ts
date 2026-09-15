import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      instructorId,
      studentName,
      parentName,
      parentMobile,
      parentEmail,
      cadence,
      selectedTier,
      paymentRail,
      recurringRate,
      billingInterval,
      joiningFee,
      initialDeposit,
      calculatedTermFee,
      hasUpfrontFees,
    } = body;

    const isSubscription = cadence === 'recurring';
    const interval = billingInterval === 'week' ? 'week' : 'month';

    const paymentMethodTypes: ('card' | 'au_becs_debit')[] =
      paymentRail === 'payto' ? ['au_becs_debit'] : ['card'];

    const lineItems: any[] = [];

    // 1. One-Time Upfront Joining Fee
    if (joiningFee && joiningFee > 0) {
      lineItems.push({
        price_data: {
          currency: 'aud',
          product_data: {
            name: 'Dojo Joining Fee',
            description: 'One-time signup fee',
          },
          unit_amount: Math.round(joiningFee * 100),
        },
        quantity: 1,
      });
    }

    // 2. One-Time Initial Deposit
    if (isSubscription && initialDeposit && initialDeposit > 0) {
      lineItems.push({
        price_data: {
          currency: 'aud',
          product_data: {
            name: 'Initial Membership Deposit',
            description: 'Instalment plan setup deposit',
          },
          unit_amount: Math.round(initialDeposit * 100),
        },
        quantity: 1,
      });
    }

    // 3. Base Membership Pricing (Recurring vs Term Upfront)
    if (isSubscription) {
      lineItems.push({
        price_data: {
          currency: 'aud',
          product_data: {
            name: `Dojo Enrollment - ${studentName}`,
            description: `${interval === 'week' ? 'Weekly' : 'Monthly'} Membership Fee`,
          },
          unit_amount: Math.round(recurringRate * 100),
          recurring: {
            interval: interval,
          },
        },
        quantity: 1,
      });
    } else {
      lineItems.push({
        price_data: {
          currency: 'aud',
          product_data: {
            name: `Dojo Term Enrollment - ${studentName}`,
            description: 'Upfront Term Payment (Pro-Rata)',
          },
          unit_amount: Math.round(calculatedTermFee * 100),
        },
        quantity: 1,
      });
    }

    const sessionConfig: any = {
      payment_method_types: paymentMethodTypes,
      customer_email: parentEmail,
      customer_creation: isSubscription ? undefined : 'always',
      line_items: lineItems,
      mode: isSubscription ? 'subscription' : 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/pay/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pay/${instructorId}?tier_id=${selectedTier}`,
      metadata: {
        instructorId,
        studentName,
        parentName,
        parentMobile,
        parentEmail,
        cadence,
        selectedTier,
        paymentRail,
        joiningFee: joiningFee || 0,
        initialDeposit: initialDeposit || 0,
      },
    };

    if (isSubscription) {
      const trialEndDate = new Date();
      if (hasUpfrontFees) {
        if (interval === 'week') {
          trialEndDate.setDate(trialEndDate.getDate() + 7);
        } else {
          trialEndDate.setMonth(trialEndDate.getMonth() + 1);
        }
      }

      sessionConfig.subscription_data = {
        description: `Dojo Subscription (${interval})`,
        ...(hasUpfrontFees && {
          trial_end: Math.floor(trialEndDate.getTime() / 1000),
        }),
        metadata: {
          instructorId,
          selectedTier,
        },
      };
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);
    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('Stripe Session Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}