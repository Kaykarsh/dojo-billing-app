'use client';

import { useState, useEffect, use } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface Tier {
  id: string;
  name: string;
  tier_type: string;
  commitment_weeks: number;
  days_per_week: number;
  upfront_fee: number;
  joining_fee: number;
  initial_deposit?: number;
  recurring_price: number;
  billing_interval: string; // 'week' | 'month' | 'year'
  weekly_price: number;
  term_price: number;
  is_popular: boolean;
  savings_text: string;
}

interface Instructor {
  id: string;
  business_name: string;
  term_start_date: string;
  term_end_date: string;
}

export default function CheckoutPage({ params }: { params: Promise<{ instructor_id: string }> }) {
  const resolvedParams = use(params);
  const instructorId = resolvedParams.instructor_id;
  const searchParams = useSearchParams();
  const tierIdFromUrl = searchParams.get('tier_id');

  const [instructor, setInstructor] = useState<Instructor | null>(null);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [selectedTierObj, setSelectedTierObj] = useState<Tier | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Form State
  const [studentName, setStudentName] = useState('');
  const [parentName, setParentName] = useState('');
  const [parentMobile, setParentMobile] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [cadence, setCadence] = useState<'recurring' | 'term_upfront'>('recurring');
  const [paymentRail, setPaymentRail] = useState<'card' | 'payto'>('card');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function fetchData() {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(instructorId)) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const { data: instructorData, error: instError } = await supabase
          .from('instructors')
          .select('*')
          .eq('id', instructorId)
          .maybeSingle();

        if (instError || !instructorData) {
          setNotFound(true);
          return;
        }

        setInstructor(instructorData);

        const { data: tierData, error: tierError } = await supabase
          .from('pricing_tiers')
          .select('*')
          .eq('instructor_id', instructorId)
          .order('term_price', { ascending: true });

        if (tierError || !tierData || tierData.length === 0) {
          setNotFound(true);
          return;
        }

        setTiers(tierData);
        const matchedTier = tierData.find((t) => t.id === tierIdFromUrl);
        const activeTier = matchedTier || tierData[0];

        setSelectedTierObj(activeTier);
        if (activeTier.tier_type === 'TFN') {
          setCadence('recurring');
        }
      } catch (err) {
            console.error('Unexpected error in checkout page:', err);
            setNotFound(true);
     } finally {
        setLoading(false);
    }
    }

    fetchData();
  }, [instructorId, tierIdFromUrl]);

  const calculateProRata = () => {
    if (!instructor || !selectedTierObj) {
      return { remainingWeeks: 10, totalWeeks: 10, calculatedTermFee: 0 };
    }

    const start = new Date(instructor.term_start_date);
    const end = new Date(instructor.term_end_date);
    const today = new Date();

    const totalTime = end.getTime() - start.getTime();
    const remainingTime = end.getTime() - today.getTime();

    const rawTotalWeeks = Math.max(1, Math.ceil(totalTime / (1000 * 60 * 60 * 24 * 7)));
    const rawRemainingWeeks = Math.max(0, Math.ceil(remainingTime / (1000 * 60 * 60 * 24 * 7)));

    const totalWeeks = rawTotalWeeks;
    const remainingWeeks = Math.min(rawRemainingWeeks, totalWeeks);

    const fullTermPrice = selectedTierObj.term_price > 0 
      ? selectedTierObj.term_price 
      : selectedTierObj.upfront_fee;
      
    const calculatedTermFee = Math.round((remainingWeeks / totalWeeks) * fullTermPrice);

    return { remainingWeeks, totalWeeks, calculatedTermFee };
  };

  const { remainingWeeks, totalWeeks, calculatedTermFee } = calculateProRata();

  const joiningFee = selectedTierObj ? Number(selectedTierObj.joining_fee || 0) : 0;
  const initialDeposit = (selectedTierObj && cadence === 'recurring') 
    ? Number(selectedTierObj.initial_deposit || selectedTierObj.upfront_fee || 0) 
    : 0;

  // Upfront fee due today (Joining fee + initial deposit)
  const totalUpfrontFees = joiningFee + initialDeposit;

  // Amount paid upfront today vs recurring later
  const totalDueToday = cadence === 'term_upfront'
    ? calculatedTermFee + joiningFee
    : (totalUpfrontFees > 0 ? totalUpfrontFees : Number(selectedTierObj?.recurring_price || selectedTierObj?.weekly_price || 0));

  const recurringRate = selectedTierObj ? Number(selectedTierObj.recurring_price || selectedTierObj.weekly_price || 0) : 0;
  const billingInterval = selectedTierObj?.billing_interval || 'month';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instructorId,
          studentName,
          parentName,
          parentMobile,
          parentEmail,
          cadence,
          selectedTier: selectedTierObj?.id,
          paymentRail,
          recurringRate,
          billingInterval,
          joiningFee,
          initialDeposit,
          calculatedTermFee,
          hasUpfrontFees: totalUpfrontFees > 0,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server Error:', errorText);
        alert('Payment setup error. Please check server logs.');
        setIsSubmitting(false);
        return;
      }

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Checkout error:', err);
      alert('An unexpected error occurred.');
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading checkout...</div>;
  if (notFound) return <div className="p-8 text-center text-red-500 font-medium">Dojo or plan not found.</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{instructor?.business_name}</h1>
          <p className="text-xs text-gray-500 mt-1">Student Enrollment & Billing Setup</p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
            Selected Plan
          </label>
          <select
            value={selectedTierObj?.id || ''}
            onChange={(e) => {
              const matched = tiers.find((t) => t.id === e.target.value);
              if (matched) setSelectedTierObj(matched);
            }}
            className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-black focus:outline-none"
          >
            {tiers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} — ${t.recurring_price || t.weekly_price}/{t.billing_interval || 'month'} ({t.days_per_week} day/wk)
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setCadence('recurring')}
            className={`py-3 text-xs font-bold rounded-xl border transition ${
              cadence === 'recurring' ? 'bg-black text-white border-black' : 'bg-white text-gray-700 border-gray-200'
            }`}
          >
            {billingInterval === 'week' ? 'Weekly' : 'Monthly'} Instalments
          </button>
          <button
            type="button"
            onClick={() => setCadence('term_upfront')}
            className={`py-3 text-xs font-bold rounded-xl border transition ${
              cadence === 'term_upfront' ? 'bg-black text-white border-black' : 'bg-white text-gray-700 border-gray-200'
            }`}
          >
            Term Upfront (Pro-Rata)
          </button>
        </div>

        {cadence === 'term_upfront' && (
          <div className="bg-green-50 border border-green-200 text-green-800 text-xs p-3 rounded-xl">
            Pro-rata calculation: {remainingWeeks} weeks remaining out of {totalWeeks} weeks in Term.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700">Student Name</label>
            <input
              type="text"
              required
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-black focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700">Parent / Guardian Name</label>
            <input
              type="text"
              required
              value={parentName}
              onChange={(e) => setParentName(e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-black focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700">Parent Email</label>
              <input
                type="email"
                required
                value={parentEmail}
                onChange={(e) => setParentEmail(e.target.value)}
                className="mt-1 w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-black focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700">Parent Mobile</label>
              <input
                type="tel"
                required
                value={parentMobile}
                onChange={(e) => setParentMobile(e.target.value)}
                className="mt-1 w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-black focus:outline-none"
              />
            </div>
          </div>

          {/* Pricing Breakdown */}
          <div className="border-t border-gray-200 pt-4 space-y-2">
            {joiningFee > 0 && (
              <div className="flex justify-between text-xs text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200">
                <span>Joining Fee:</span>
                <span className="font-semibold">+${joiningFee}.00</span>
              </div>
            )}

            {initialDeposit > 0 && cadence === 'recurring' && (
              <div className="flex justify-between text-xs text-blue-800 bg-blue-50 p-2 rounded-lg border border-blue-200">
                <span>Initial Deposit / Upfront:</span>
                <span className="font-semibold">+${initialDeposit}.00</span>
              </div>
            )}

            {cadence === 'recurring' && (
              <div className="flex justify-between text-xs text-gray-600">
                <span>Ongoing Instalment Rate:</span>
                <span className="font-semibold">${recurringRate} / {billingInterval}</span>
              </div>
            )}

            <div className="flex justify-between items-center text-lg font-bold text-gray-900 pt-2 border-t">
              <span>Total Due Today:</span>
              <span>${totalDueToday}</span>
            </div>
            
            {cadence === 'recurring' && totalUpfrontFees > 0 && (
              <p className="text-[11px] text-gray-500 italic text-right">
                First recurring ${recurringRate} payment starts in 1 {billingInterval}.
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-black text-white font-bold py-3.5 rounded-xl hover:bg-gray-800 transition disabled:opacity-50"
          >
            {isSubmitting ? 'Processing...' : `Proceed to Payment Setup ($${totalDueToday})`}
          </button>
        </form>
      </div>
    </div>
  );
}