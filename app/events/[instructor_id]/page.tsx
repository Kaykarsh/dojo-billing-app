'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabase';

interface EventRecord {
  id: string;
  title: string;
  amount: number;
  event_date: string;
}

export default function PublicEventsPage({ params }: { params: Promise<{ instructor_id: string }> }) {
  const resolvedParams = use(params);
  const instructorId = resolvedParams.instructor_id;

  const [events, setEvents] = useState<EventRecord[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventRecord | null>(null);
  const [studentName, setStudentName] = useState('');
  const [parentName, setParentName] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function fetchEvents() {
      const { data } = await supabase
        .from('events')
        .select('*')
        .eq('instructor_id', instructorId)
        .gte('event_date', new Date().toISOString().split('T')[0])
        .order('event_date', { ascending: true });

      if (data) {
        setEvents(data);
        if (data.length > 0) setSelectedEvent(data[0]);
      }
      setLoading(false);
    }
    fetchEvents();
  }, [instructorId]);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/checkout/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instructorId,
          eventId: selectedEvent.id,
          eventTitle: selectedEvent.title,
          amount: selectedEvent.amount,
          studentName,
          parentName,
          parentEmail,
        }),
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert('Checkout error');
        setIsSubmitting(false);
      }
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-xs text-gray-500">Loading dojo events...</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-md mx-auto bg-white rounded-2xl p-6 shadow-sm border border-gray-200 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Upcoming Events & Gradings</h1>
          <p className="text-xs text-gray-500 mt-1">Select an event to register your student</p>
        </div>

        {events.length === 0 ? (
          <p className="text-xs text-gray-500 text-center py-4">No upcoming events scheduled.</p>
        ) : (
          <form onSubmit={handleCheckout} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-gray-900 mb-1">Select Event</label>
              <select
                value={selectedEvent?.id || ''}
                onChange={(e) => {
                  const match = events.find((evt) => evt.id === e.target.value);
                  if (match) setSelectedEvent(match);
                }}
                className="w-full border border-gray-300 rounded-xl p-3 text-xs focus:ring-2 focus:ring-black"
              >
                {events.map((evt) => (
                  <option key={evt.id} value={evt.id}>
                    {evt.title} — ${evt.amount} ({new Date(evt.event_date).toLocaleDateString('en-AU')})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-gray-900 mb-1">Student Name</label>
              <input
                type="text"
                required
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-black"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-900 mb-1">Parent Name</label>
              <input
                type="text"
                required
                value={parentName}
                onChange={(e) => setParentName(e.target.value)}
                className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-black"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-900 mb-1">Parent Email</label>
              <input
                type="email"
                required
                value={parentEmail}
                onChange={(e) => setParentEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-black"
              />
            </div>

            <div className="border-t pt-4 flex justify-between items-center text-sm font-bold">
              <span>Total Fee:</span>
              <span className="text-base font-extrabold text-gray-900">${selectedEvent?.amount || 0}</span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-black text-white font-bold py-3.5 rounded-xl hover:bg-gray-800 transition disabled:opacity-50"
            >
              {isSubmitting ? 'Redirecting...' : `Pay & Register ($${selectedEvent?.amount || 0})`}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}