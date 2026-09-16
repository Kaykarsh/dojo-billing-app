'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface EventRecord {
  id: string;
  title: string;
  amount: number;
  event_date: string;
  created_at: string;
}

export default function DashboardEventsPage() {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [eventDate, setEventDate] = useState('');

  const getUserId = async () => {
    const res = await fetch('/api/auth/me');
    if (!res.ok) return null;
    const data = await res.json();
    return data.user?.id || null;
  };

  const loadEvents = async () => {
    const userId = await getUserId();
    if (!userId) return;

    const { data } = await supabase
      .from('events')
      .select('*')
      .eq('instructor_id', userId)
      .order('event_date', { ascending: true });

    if (data) setEvents(data);
    setLoading(false);
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const userId = await getUserId();
    if (!userId) return;

    const { error } = await supabase.from('events').insert({
      instructor_id: userId,
      title,
      amount: Number(amount),
      event_date: eventDate,
    });

    if (error) {
      alert(`Error creating event: ${error.message}`);
    } else {
      setIsModalOpen(false);
      setTitle('');
      setAmount('');
      setEventDate('');
      loadEvents();
    }
  };

  if (loading) return <div className="text-xs text-gray-500 font-medium">Loading events...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Events & Gradings</h1>
          <p className="text-xs text-gray-600 mt-0.5">Manage belt gradings and tournaments</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-black text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-gray-800 transition shadow-sm"
        >
          + Create Event
        </button>
      </div>

      {events.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center space-y-2 shadow-sm">
          <p className="text-sm font-bold text-gray-900">No events scheduled</p>
          <p className="text-xs text-gray-600 max-w-sm mx-auto">
            Create an event to allow parents to register and pay online.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {events.map((evt) => (
            <div key={evt.id} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-2">
              <div className="flex justify-between items-start">
                <h3 className="text-lg font-bold text-gray-900">{evt.title}</h3>
                <span className="text-lg font-extrabold text-gray-900">${evt.amount}</span>
              </div>
              <p className="text-xs text-gray-500 font-medium">
                📅 {new Date(evt.event_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900">Create New Event</h2>
            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-900 mb-1">Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Autumn Belt Grading"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-black text-gray-900"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-900 mb-1">Fee ($)</label>
                  <input
                    type="number"
                    required
                    placeholder="65.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-black text-gray-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-900 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-black text-gray-900"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl font-bold text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 rounded-xl font-bold bg-black text-white hover:bg-gray-800">
                  Save Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}