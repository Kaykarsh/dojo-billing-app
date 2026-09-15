import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-08-26.dahlia' as any, // Updates to the latest stable Stripe API version
  appInfo: {
    name: 'Dojo Billing App',
    version: '1.0.0',
  },
});