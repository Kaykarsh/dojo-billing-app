'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface PricingTier {
  id: string;
  name: string;
  tier_type: string;
  days_per_week: number;
  weekly_price: number;
  term_price: number;
  upfront_fee: number;
  recurring_price: number;
  billing_interval: string;
  initial_deposit: number;
  joining_fee: number;
  commitment_weeks: number;
  savings_text: string;
  is_popular: boolean;
}

export default function PricingTiersPage() {
  const [tiers, setTiers] = useState<PricingTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTierId, setEditingTierId] = useState<string | null>(null);

  const initialFormState = {
    name: '',
    tier_type: 'Standard',
    days_per_week: '2',
    weekly_price: '',
    term_price: '',
    upfront_fee: '',
    recurring_price: '',
    billing_interval: 'month',
    initial_deposit: '',
    joining_fee: '0',
    commitment_weeks: '22',
    savings_text: '',
    is_popular: false,
  };

  const [formData, setFormData] = useState(initialFormState);

  const loadTiers = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('pricing_tiers')
      .select('*')
      .eq('instructor_id', user.id)
      .order('created_at', { ascending: true });

    if (data) setTiers(data);
    setLoading(false);
  };

  useEffect(() => {
    loadTiers();
  }, []);

  const handleOpenAddModal = () => {
    setEditingTierId(null);
    setFormData(initialFormState);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (tier: PricingTier) => {
    setEditingTierId(tier.id);
    setFormData({
      name: tier.name || '',
      tier_type: tier.tier_type || 'Standard',
      days_per_week: String(tier.days_per_week ?? '2'),
      weekly_price: String(tier.weekly_price ?? ''),
      term_price: String(tier.term_price ?? ''),
      upfront_fee: String(tier.upfront_fee ?? ''),
      recurring_price: String(tier.recurring_price ?? ''),
      billing_interval: tier.billing_interval || 'month',
      initial_deposit: String(tier.initial_deposit ?? ''),
      joining_fee: String(tier.joining_fee ?? '0'),
      commitment_weeks: String(tier.commitment_weeks ?? '22'),
      savings_text: tier.savings_text || '',
      is_popular: Boolean(tier.is_popular),
    });
    setIsModalOpen(true);
  };

  const handleSaveTier = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload = {
      instructor_id: user.id,
      name: formData.name,
      tier_type: formData.tier_type,
      days_per_week: Number(formData.days_per_week),
      weekly_price: Number(formData.weekly_price || 0),
      term_price: Number(formData.term_price || 0),
      upfront_fee: Number(formData.upfront_fee || formData.term_price || 0),
      recurring_price: Number(formData.recurring_price || formData.weekly_price || 0),
      billing_interval: formData.billing_interval,
      initial_deposit: Number(formData.initial_deposit || 0),
      joining_fee: Number(formData.joining_fee || 0),
      commitment_weeks: Number(formData.commitment_weeks || 0),
      savings_text: formData.savings_text,
      is_popular: formData.is_popular,
    };

    let error;
    if (editingTierId) {
      // Perform Update query
      const res = await supabase
        .from('pricing_tiers')
        .update(payload)
        .eq('id', editingTierId)
        .eq('instructor_id', user.id);
      error = res.error;
    } else {
      // Perform Insert query
      const res = await supabase.from('pricing_tiers').insert(payload);
      error = res.error;
    }

    if (error) {
      alert(`Error saving tier: ${error.message}`);
    } else {
      setIsModalOpen(false);
      setEditingTierId(null);
      setFormData(initialFormState);
      loadTiers();
    }
  };

  if (loading) return <div className="text-xs text-gray-500 font-medium">Loading pricing tiers...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pricing Tiers</h1>
          <p className="text-xs text-gray-600 mt-0.5">Configure term structures, direct debit options, and savings text</p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="bg-black text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-gray-800 transition shadow-sm"
        >
          + Add New Tier
        </button>
      </div>

      {/* Grid Display */}
      {tiers.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center space-y-3">
          <p className="text-sm font-bold text-gray-900">No pricing tiers configured</p>
          <p className="text-xs text-gray-600 max-w-sm mx-auto">
            Click above to add flexible membership packages for upfront term payments or direct debit schedules.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tiers.map((tier) => (
            <div key={tier.id} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-gray-900">{tier.name}</h3>
                    <span className="text-[10px] bg-gray-100 text-gray-800 px-2 py-0.5 rounded-md font-semibold">
                      {tier.tier_type}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 font-medium">{tier.days_per_week} Day(s) per week</p>
                </div>
                <div className="flex items-center gap-2">
                  {tier.is_popular && (
                    <span className="bg-black text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Popular
                    </span>
                  )}
                  <button
                    onClick={() => handleOpenEditModal(tier)}
                    className="text-xs font-bold text-gray-700 hover:text-black hover:bg-gray-100 px-2.5 py-1 rounded-lg border border-gray-200 transition"
                  >
                    Edit
                  </button>
                </div>
              </div>

              {tier.savings_text && (
                <div className="bg-red-50 text-red-700 text-[11px] font-bold px-2.5 py-1 rounded-lg border border-red-200 inline-block">
                  {tier.savings_text}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-xs border-t border-b border-gray-100 py-3">
                <div>
                  <span className="text-gray-500 block text-[10px] font-bold uppercase tracking-wider">Upfront / Term</span>
                  <span className="font-extrabold text-gray-900">${tier.upfront_fee || tier.term_price}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px] font-bold uppercase tracking-wider">Recurring Payment</span>
                  <span className="font-extrabold text-gray-900">
                    ${tier.recurring_price || tier.weekly_price} / {tier.billing_interval}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px] font-bold uppercase tracking-wider">Initial Deposit</span>
                  <span className="font-semibold text-gray-800">${tier.initial_deposit}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px] font-bold uppercase tracking-wider">Joining Fee</span>
                  <span className="font-semibold text-gray-800">${tier.joining_fee}</span>
                </div>
              </div>

              <div className="text-[11px] text-gray-700 font-semibold">
                Commitment: {tier.commitment_weeks} Weeks
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Shared Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl my-8 border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900">
              {editingTierId ? 'Edit Membership Tier' : 'Configure Membership Tier'}
            </h2>
            <form onSubmit={handleSaveTier} className="space-y-4 text-xs">
              
              {/* Core Information */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block font-bold text-gray-900 mb-1">Tier Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Standard 2-Day (12 Months)"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-white text-gray-900 border border-gray-300 rounded-xl px-3 py-2 text-xs font-medium placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-900 mb-1">Tier Type</label>
                  <select
                    value={formData.tier_type}
                    onChange={(e) => setFormData({ ...formData, tier_type: e.target.value })}
                    className="w-full bg-white text-gray-900 border border-gray-300 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
                  >
                    <option value="Standard">Standard</option>
                    <option value="Non-Standard">Non-Standard</option>
                    <option value="TFN">TFN (Month to Month)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-gray-900 mb-1">Days / Week</label>
                  <input
                    type="number"
                    required
                    value={formData.days_per_week}
                    onChange={(e) => setFormData({ ...formData, days_per_week: e.target.value })}
                    className="w-full bg-white text-gray-900 border border-gray-300 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-900 mb-1">Commitment (Wks)</label>
                  <input
                    type="number"
                    required
                    value={formData.commitment_weeks}
                    onChange={(e) => setFormData({ ...formData, commitment_weeks: e.target.value })}
                    className="w-full bg-white text-gray-900 border border-gray-300 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-900 mb-1">Billing Interval</label>
                  <select
                    value={formData.billing_interval}
                    onChange={(e) => setFormData({ ...formData, billing_interval: e.target.value })}
                    className="w-full bg-white text-gray-900 border border-gray-300 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
                  >
                    <option value="week">Weekly</option>
                    <option value="month">Monthly</option>
                    <option value="year">Yearly</option>
                  </select>
                </div>
              </div>

              {/* Pricing Structures */}
              <div className="border-t border-gray-200 pt-3 space-y-3">
                <span className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider block">
                  Upfront & Recurring Amounts
                </span>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-900 mb-1">Term Price / Upfront ($)</label>
                    <input
                      type="number"
                      placeholder="1320.00"
                      value={formData.term_price}
                      onChange={(e) => setFormData({ ...formData, term_price: e.target.value, upfront_fee: e.target.value })}
                      className="w-full bg-white text-gray-900 border border-gray-300 rounded-xl px-3 py-2 text-xs font-medium placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-900 mb-1">Recurring Repayment ($)</label>
                    <input
                      type="number"
                      placeholder="90.00"
                      value={formData.recurring_price}
                      onChange={(e) => setFormData({ ...formData, recurring_price: e.target.value, weekly_price: e.target.value })}
                      className="w-full bg-white text-gray-900 border border-gray-300 rounded-xl px-3 py-2 text-xs font-medium placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-900 mb-1">Initial Deposit ($)</label>
                    <input
                      type="number"
                      placeholder="330.00"
                      value={formData.initial_deposit}
                      onChange={(e) => setFormData({ ...formData, initial_deposit: e.target.value })}
                      className="w-full bg-white text-gray-900 border border-gray-300 rounded-xl px-3 py-2 text-xs font-medium placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-900 mb-1">Joining Fee ($)</label>
                    <input
                      type="number"
                      placeholder="100.00"
                      value={formData.joining_fee}
                      onChange={(e) => setFormData({ ...formData, joining_fee: e.target.value })}
                      className="w-full bg-white text-gray-900 border border-gray-300 rounded-xl px-3 py-2 text-xs font-medium placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
                    />
                  </div>
                </div>
              </div>

              {/* Marketing Callouts */}
              <div className="border-t border-gray-200 pt-3 space-y-3">
                <span className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider block">
                  Promotions & Callouts
                </span>
                <div>
                  <label className="block font-bold text-gray-900 mb-1">Savings Text / Badge</label>
                  <input
                    type="text"
                    placeholder="e.g. Save $840 + NO JOINING FEE"
                    value={formData.savings_text}
                    onChange={(e) => setFormData({ ...formData, savings_text: e.target.value })}
                    className="w-full bg-white text-gray-900 border border-gray-300 rounded-xl px-3 py-2 text-xs font-medium placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
                  />
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="is_popular"
                    checked={formData.is_popular}
                    onChange={(e) => setFormData({ ...formData, is_popular: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
                  />
                  <label htmlFor="is_popular" className="font-bold text-gray-900 text-xs">Highlight as Featured Option</label>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl font-bold text-gray-700 hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl font-bold bg-black text-white hover:bg-gray-800 transition shadow-sm"
                >
                  {editingTierId ? 'Update Tier' : 'Save Tier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}