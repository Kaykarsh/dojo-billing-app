'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface SessionDetails {
  amountPaidToday?: number;
  amountTotal?: number;
  studentName: string;
  parentEmail: string;
  cadence: string;
  planName: string;
  recurringRate: number;
  billingInterval: string;
  lineItems: Array<{ description: string; amount: number }>;
}

export default function EnrollmentSuccessPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  const [details, setDetails] = useState<SessionDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }

    async function fetchDetails() {
      try {
        const res = await fetch(`/api/checkout/session?session_id=${sessionId}`);
        if (res.ok) {
          const data = await res.json();
          setDetails(data);
        }
      } catch (err) {
        console.error('Failed to load receipt details:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchDetails();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-xs font-semibold text-gray-500">Loading receipt details...</div>
      </div>
    );
  }

  const paidAmount = details?.amountPaidToday ?? details?.amountTotal ?? 0;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-sm border border-gray-100 space-y-6 text-center">
        
        {/* Success Checkmark */}
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
          ✓
        </div>

        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Enrollment Successful!</h1>
          <p className="text-xs text-gray-500 mt-1">
            Your payment and student registration have been confirmed.
          </p>
        </div>

        {details && (
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 text-left space-y-4">
            
            {/* Student & Plan Summary */}
            <div className="border-b border-gray-200 pb-3">
              <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">
                Student Enrolled
              </span>
              <p className="text-sm font-bold text-gray-900 mt-0.5">{details.studentName}</p>
              <p className="text-xs text-gray-500">{details.parentEmail}</p>
            </div>

            {/* Line Item Breakdown */}
            <div className="space-y-2 text-xs">
              <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">
                Payment Breakdown
              </span>
              
              {details.lineItems?.map((item, idx) => (
                <div key={idx} className="flex justify-between text-gray-700 font-medium">
                  <span>{item.description}</span>
                  <span className="font-bold text-gray-900">${(item.amount ?? 0).toFixed(2)}</span>
                </div>
              ))}
            </div>

            {/* Total Paid Today */}
            <div className="border-t border-gray-200 pt-3 flex justify-between items-center text-sm font-bold text-gray-900">
              <span>Amount Paid Today:</span>
              <span className="text-base font-extrabold text-green-700">
                ${paidAmount.toFixed(2)} AUD
              </span>
            </div>

            {/* Future Recurring Schedule Callout */}
            {details.cadence === 'recurring' && (details.recurringRate ?? 0) > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-900 space-y-0.5">
                <span className="font-bold block">Ongoing Membership Schedule</span>
                <p className="text-[11px] text-blue-800">
                  Subsequent payments of <span className="font-bold">${(details.recurringRate ?? 0).toFixed(2)} / {details.billingInterval || 'month'}</span> will automatically commence next {details.billingInterval || 'month'}.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Reference Code */}
        {sessionId && (
          <div className="bg-gray-100 rounded-xl p-3 text-[11px] font-mono text-gray-500 break-all">
            Ref: {sessionId}
          </div>
        )}

        <Link
          href="/"
          className="block w-full bg-black text-white font-bold py-3.5 rounded-2xl hover:bg-gray-800 transition text-xs"
        >
          Return to Home
        </Link>
      </div>
    </div>
  );
}