import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface PricingTier {
  id: string;
  name: string;
  tier_type: string;
  commitment_weeks: number;
  days_per_week: number;
  upfront_fee: number;
  recurring_price: number;
  billing_interval: string;
  weekly_price: number;
  term_price: number;
  joining_fee: number;
  is_popular: boolean;
  savings_text: string;
}

export default async function PricingPage({ params }: { params: Promise<{ instructor_id: string }> }) {
  const { instructor_id } = await params;

  // 1. Fetch Instructor Business Name
  const { data: instructor } = await supabase
    .from('instructors')
    .select('business_name')
    .eq('id', instructor_id)
    .single();

  // 2. Fetch Dynamic Pricing Tiers from Database
  const { data: tiers } = await supabase
    .from('pricing_tiers')
    .select('*')
    .eq('instructor_id', instructor_id)
    .order('weekly_price', { ascending: true });

  if (!instructor || !tiers || tiers.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500 font-medium">No active pricing tiers found for this dojo.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto text-center">
        <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
          {instructor.business_name}
        </h1>
        <p className="mt-3 text-xl text-gray-500">
          Select a membership option to begin student enrollment.
        </p>
      </div>

      <div className="mt-12 max-w-6xl mx-auto grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {tiers.map((tier: PricingTier) => {
          const effectiveUpfrontFee = Number(tier.upfront_fee || tier.joining_fee || 0);

          return (
            <div
              key={tier.id}
              className={`bg-white rounded-2xl p-6 flex flex-col justify-between relative ${
                tier.is_popular
                  ? 'shadow-md border-2 border-black'
                  : 'shadow-sm border border-gray-200'
              }`}
            >
              {tier.is_popular && (
                <div className="absolute -top-3 right-4 bg-black text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Popular
                </div>
              )}
              <div>
                <h2 className="text-base font-bold text-gray-900">{tier.name}</h2>
                <p className="text-xs text-gray-500 mt-1">
                  {tier.commitment_weeks > 0 ? `${tier.commitment_weeks} Weeks` : 'Month-to-Month'} • {tier.days_per_week} Day{tier.days_per_week > 1 ? 's' : ''}/wk
                </p>

                <div className="mt-4">
                  <span className="text-3xl font-extrabold text-gray-900">
                    ${tier.term_price > 0 ? tier.term_price : tier.recurring_price}
                  </span>
                  <span className="text-sm text-gray-500">
                    {tier.term_price > 0 ? ' total' : ` / ${tier.billing_interval || 'month'}`}
                  </span>
                </div>

                {effectiveUpfrontFee > 0 ? (
                  <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded mt-2 border border-amber-200">
                    +${effectiveUpfrontFee}.00 {tier.tier_type === 'tfn' ? 'Joining Fee' : 'Initial Deposit'}
                  </p>
                ) : (
                  <p className="text-xs text-green-700 bg-green-50 p-2 rounded mt-2 border border-green-200">
                    ★ NO Joining Fee (Save $100)
                  </p>
                )}

                {tier.savings_text && (
                  <p className="text-xs font-semibold text-gray-700 mt-2">
                    {tier.savings_text}
                  </p>
                )}
              </div>

              <Link
                href={`/pay/${instructor_id}?tier_id=${tier.id}`}
                className={`mt-8 block w-full text-center font-semibold py-2.5 rounded-xl transition text-sm ${
                  tier.is_popular
                    ? 'bg-black text-white hover:bg-gray-800'
                    : 'bg-gray-900 text-white hover:bg-gray-800'
                }`}
              >
                Enroll Now
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}