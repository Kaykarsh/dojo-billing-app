'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabase';

interface FormFieldConfig {
  id: string;
  label: string;
  type: 'text' | 'checkbox_group';
  required: boolean;
  options?: string[];
}

interface EventRecord {
  id: string;
  title: string;
  amount: number;
  event_date: string;
  deadline_date?: string;
  description?: string;
  location?: string;
  capacity?: number;
  event_type?: string;
  has_waiver?: boolean;
  waiver_text?: string;
  form_fields?: FormFieldConfig[];
}

interface StudentOption {
  id: string;
  student_name: string;
}

export default function PublicEventsPage({ params }: { params: Promise<{ instructor_id: string }> }) {
  const resolvedParams = use(params);
  const instructorId = resolvedParams.instructor_id;

  const [events, setEvents] = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Auth Modal State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [magicEmail, setMagicEmail] = useState('');
  const [magicSent, setMagicSent] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  // Enrollment Drawer State
  const [selectedEvent, setSelectedEvent] = useState<EventRecord | null>(null);
  const [linkedStudents, setLinkedStudents] = useState<StudentOption[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [newStudentName, setNewStudentName] = useState('');
  const [formResponses, setFormResponses] = useState<Record<string, any>>({});
  const [waiverAccepted, setWaiverAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check auth session & load events
// 1. Fetch public events on load
useEffect(() => {
  async function init() {
    const userRes = await fetch('/api/auth/me');
    if (userRes.ok) {
      const { user } = await userRes.json();
      setCurrentUser(user);
    }

    const { data } = await supabase
      .from('events')
      .select('*')
      .eq('instructor_id', instructorId)
      .gte('event_date', new Date().toISOString().split('T')[0])
      .order('event_date', { ascending: true });

    if (data) setEvents(data);
    setLoading(false);
  }
  init();
}, [instructorId]);

// 2. Fetch linked students automatically whenever currentUser changes or selectedEvent is opened
useEffect(() => {
  if (currentUser) {
    loadParentStudents();
  }
}, [currentUser, selectedEvent]);

const loadParentStudents = async () => {
  try {
    const res = await fetch('/api/parent/students');
    if (res.ok) {
      const data = await res.json();
      const studentsList = data.students || [];
      setLinkedStudents(studentsList);

      if (studentsList.length > 0) {
        setSelectedStudentId(studentsList[0].id);
        setNewStudentName(studentsList[0].student_name);
      } else {
        setSelectedStudentId('new');
        setNewStudentName('');
      }
    }
  } catch (err) {
    console.error('Failed to load parent students:', err);
  }
};

  const handleSendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);

    const res = await fetch('/api/auth/magic-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: magicEmail,
        redirectTo: `${window.location.origin}/api/auth/callback?next=/events/${instructorId}`,
      }),
    });

    setAuthLoading(false);
    if (res.ok) {
      setMagicSent(true);
    } else {
      alert('Error sending magic link. Please try again.');
    }
  };

  const handleOpenEnrollment = (event: EventRecord) => {
    if (!currentUser) {
      setSelectedEvent(event);
      setIsAuthModalOpen(true);
    } else {
      setSelectedEvent(event);
      setFormResponses({});
      setWaiverAccepted(false);
    }
  };

  const handleCheckboxGroupChange = (fieldId: string, option: string, isChecked: boolean) => {
    const currentList: string[] = formResponses[fieldId] || [];
    let updated: string[];
    if (isChecked) {
      updated = [...currentList, option];
    } else {
      updated = currentList.filter((item) => item !== option);
    }
    setFormResponses({ ...formResponses, [fieldId]: updated });
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;

    if (selectedEvent.has_waiver && !waiverAccepted) {
      alert('Please accept the liability waiver before proceeding.');
      return;
    }

    setIsSubmitting(true);

    try {
      const studentName =
        selectedStudentId === 'new' || linkedStudents.length === 0
          ? newStudentName
          : linkedStudents.find((s) => s.id === selectedStudentId)?.student_name || '';

      const response = await fetch('/api/checkout/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instructorId,
          eventId: selectedEvent.id,
          eventTitle: selectedEvent.title,
          amount: selectedEvent.amount,
          studentId: selectedStudentId !== 'new' ? selectedStudentId : null,
          studentName,
          parentName: currentUser?.user_metadata?.full_name || currentUser?.email?.split('@')[0],
          parentEmail: currentUser?.email,
          formResponses,
          waiverAccepted,
        }),
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(`Checkout error: ${data.error}`);
        setIsSubmitting(false);
      }
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-xs text-gray-500">Loading dojo events...</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center border-b pb-5">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Upcoming Events & Gradings</h1>
            <p className="text-xs text-gray-500 mt-1">Select an event below to register your student</p>
          </div>

          {currentUser ? (
            <div className="text-right text-xs">
              <span className="text-gray-500 block">Signed in as</span>
              <span className="font-bold text-gray-900">{currentUser.email}</span>
            </div>
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="bg-black text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-gray-800 transition"
            >
              Sign In
            </button>
          )}
        </div>

        {/* Event Tiles Grid */}
        {events.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center text-xs text-gray-500">
            No upcoming events scheduled at this time.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((evt) => (
              <div
                key={evt.id}
                className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col justify-between shadow-sm hover:shadow-md transition space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-800 px-2.5 py-1 rounded-md">
                      {evt.event_type || 'Tournament'}
                    </span>
                    <span className="text-xl font-extrabold text-gray-900">${evt.amount}</span>
                  </div>

                  <h3 className="text-lg font-bold text-gray-900 leading-snug">{evt.title}</h3>

                  {evt.description && (
                    <p className="text-xs text-gray-600 line-clamp-3 leading-relaxed">{evt.description}</p>
                  )}

                  <div className="space-y-1 text-xs text-gray-500 pt-2 border-t border-gray-100">
                    <div>📅 <strong>Date:</strong> {new Date(evt.event_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                    {evt.location && <div>📍 <strong>Venue:</strong> {evt.location}</div>}
                    {evt.deadline_date && (
                      <div className="text-amber-800 font-semibold">
                        ⏳ <strong>Deadline:</strong> {new Date(evt.deadline_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleOpenEnrollment(evt)}
                  className="w-full bg-black text-white text-xs font-bold py-3 rounded-xl hover:bg-gray-800 transition shadow-sm cursor-pointer"
                >
                  Enroll Student
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Auth Modal (Passwordless Magic Link) */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-gray-100">
            <div className="flex justify-between items-center border-b pb-3">
              <h2 className="text-lg font-bold text-gray-900">Sign In Required</h2>
              <button onClick={() => setIsAuthModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            {magicSent ? (
              <div className="bg-green-50 border border-green-200 text-green-900 p-4 rounded-xl text-xs space-y-2 text-center">
                <p className="font-bold text-sm">Magic Link Sent! ✉️</p>
                <p>Check <strong>{magicEmail}</strong> for your secure login link to complete enrollment.</p>
              </div>
            ) : (
              <form onSubmit={handleSendMagicLink} className="space-y-3 text-xs">
                <p className="text-gray-600">Enter your email address to receive a secure login link. No password required.</p>
                <div>
                  <label className="block font-bold text-gray-900 mb-1">Parent Email</label>
                  <input
                    type="email"
                    required
                    placeholder="parent@example.com"
                    value={magicEmail}
                    onChange={(e) => setMagicEmail(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-gray-900 focus:ring-2 focus:ring-black"
                  />
                </div>
                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full bg-black text-white font-bold py-3 rounded-xl hover:bg-gray-800 transition disabled:opacity-50"
                >
                  {authLoading ? 'Sending...' : 'Send Magic Link'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Enrollment Drawer / Modal */}
      {selectedEvent && currentUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full space-y-5 shadow-2xl border border-gray-100 my-8">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{selectedEvent.title}</h2>
                <p className="text-xs text-gray-500">${selectedEvent.amount} AUD Entry Fee</p>
              </div>
              <button onClick={() => setSelectedEvent(null)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
            </div>

            <form onSubmit={handleCheckout} className="space-y-4 text-xs">
              {/* Select Enrolling Child */}
             <div>
  <label className="block font-bold text-gray-900 mb-1">Select Student</label>
  {linkedStudents.length > 0 ? (
    <select
      value={selectedStudentId}
      onChange={(e) => {
        setSelectedStudentId(e.target.value);
        if (e.target.value !== 'new') {
          const match = linkedStudents.find((s) => s.id === e.target.value);
          if (match) setNewStudentName(match.student_name);
        } else {
          setNewStudentName('');
        }
      }}
      className="w-full border border-gray-300 rounded-xl p-2.5 text-gray-900 font-semibold focus:ring-2 focus:ring-black"
    >
      {linkedStudents.map((s) => (
        <option key={s.id} value={s.id}>
          {s.student_name}
        </option>
      ))}
      <option value="new">+ Register New Sibling / Child</option>
    </select>
  ) : null}

  {/* Show text input only if no linked students exist OR if '+ Register New Sibling' is chosen */}
  {(linkedStudents.length === 0 || selectedStudentId === 'new') && (
    <input
      type="text"
      required
      placeholder="Enter Student Full Name"
      value={newStudentName}
      onChange={(e) => setNewStudentName(e.target.value)}
      className="mt-2 w-full border border-gray-300 rounded-xl p-2.5 text-gray-900 focus:ring-2 focus:ring-black"
    />
  )}
</div>

              {/* Dynamic Form Fields */}
              {selectedEvent.form_fields && selectedEvent.form_fields.length > 0 && (
                <div className="border-t pt-3 space-y-3">
                  <span className="font-extrabold text-gray-700 uppercase tracking-wider text-[10px]">
                    Event Entry Options
                  </span>

                  {selectedEvent.form_fields.map((field) => (
                    <div key={field.id} className="space-y-1.5">
                      <label className="block font-bold text-gray-900">
                        {field.label} {field.required && <span className="text-red-500">*</span>}
                      </label>

                      {field.type === 'text' && (
                        <input
                          type="text"
                          required={field.required}
                          value={formResponses[field.id] || ''}
                          onChange={(e) => setFormResponses({ ...formResponses, [field.id]: e.target.value })}
                          className="w-full border border-gray-300 rounded-xl p-2.5 text-gray-900 focus:ring-2 focus:ring-black"
                        />
                      )}

                      {field.type === 'checkbox_group' && field.options && (
                        <div className="grid grid-cols-2 gap-2 bg-gray-50 p-3 rounded-xl border border-gray-200">
                          {field.options.map((opt) => {
                            const checked = (formResponses[field.id] || []).includes(opt);
                            return (
                              <label key={opt} className="flex items-center gap-2 font-medium text-gray-800">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(e) => handleCheckboxGroupChange(field.id, opt, e.target.checked)}
                                  className="rounded border-gray-300 text-black focus:ring-black"
                                />
                                {opt}
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Liability Waiver */}
              {selectedEvent.has_waiver && (
                <div className="border-t pt-3 space-y-2 bg-gray-50 p-3 rounded-xl border border-gray-200">
                  <span className="font-bold text-gray-900 block text-[11px]">Liability Release & Waiver</span>
                  <p className="text-[11px] text-gray-600 leading-relaxed max-h-24 overflow-y-auto">
                    {selectedEvent.waiver_text}
                  </p>
                  <label className="flex items-center gap-2 pt-1 font-bold text-gray-900">
                    <input
                      type="checkbox"
                      required
                      checked={waiverAccepted}
                      onChange={(e) => setWaiverAccepted(e.target.checked)}
                      className="rounded border-gray-300 text-black focus:ring-black"
                    />
                    I accept the terms and conditions above
                  </label>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setSelectedEvent(null)}
                  className="px-4 py-2.5 rounded-xl font-bold text-gray-700 hover:bg-gray-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl font-bold bg-black text-white hover:bg-gray-800 transition disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Redirecting...' : `Pay & Complete Entry ($${selectedEvent.amount})`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}