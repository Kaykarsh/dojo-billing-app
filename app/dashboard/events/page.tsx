'use client';

import { useEffect, useState } from 'react';

interface FormFieldConfig {
  id: string;
  label: string;
  type: 'text' | 'checkbox_group';
  required: boolean;
  options?: string[];
  optionsRaw?: string; // Stores raw string locally so spaces and commas can be typed seamlessly
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
  created_at: string;
}

export default function DashboardEventsPage() {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [deadlineDate, setDeadlineDate] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [capacity, setCapacity] = useState('');
  const [eventType, setEventType] = useState('Tournament');
  const [hasWaiver, setHasWaiver] = useState(true);
  const [waiverText, setWaiverText] = useState(
    'I, the undersigned parent/guardian, hereby give permission for my child to participate in this event and release the dojo and its instructors from liability.'
  );

  // Dynamic Custom Fields State
  const [formFields, setFormFields] = useState<FormFieldConfig[]>([]);

  const loadEvents = async () => {
    try {
      const res = await fetch('/api/events');
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
      }
    } catch (err) {
      console.error('Failed to load events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const handleAddField = (type: 'text' | 'checkbox_group') => {
    const defaultOptions = ['Kata', 'Kumite', 'Team Kata'];
    const newField: FormFieldConfig = {
      id: `field_${Date.now()}`,
      label: type === 'text' ? 'e.g. Current Rank / Belt' : 'Please select events entering',
      type,
      required: false,
      options: type === 'checkbox_group' ? defaultOptions : undefined,
      optionsRaw: type === 'checkbox_group' ? defaultOptions.join(', ') : '',
    };
    setFormFields([...formFields, newField]);
  };

  const handleRemoveField = (index: number) => {
    setFormFields(formFields.filter((_, i) => i !== index));
  };

  const handleUpdateField = (index: number, key: keyof FormFieldConfig, value: any) => {
    const updated = [...formFields];
    updated[index] = { ...updated[index], [key]: value };
    setFormFields(updated);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clean up options before submitting payload
    const processedFields = formFields.map((field) => {
      if (field.type === 'checkbox_group') {
        const parsedOptions = (field.optionsRaw || field.options?.join(', ') || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        return {
          id: field.id,
          label: field.label,
          type: field.type,
          required: field.required,
          options: parsedOptions,
        };
      }
      return {
        id: field.id,
        label: field.label,
        type: field.type,
        required: field.required,
      };
    });

    const payload = {
      title,
      amount: Number(amount),
      event_date: eventDate,
      deadline_date: deadlineDate || null,
      description: description || null,
      location: location || null,
      capacity: capacity ? Number(capacity) : null,
      event_type: eventType,
      has_waiver: hasWaiver,
      waiver_text: hasWaiver ? waiverText : null,
      form_fields: processedFields,
    };

    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json();
      alert(`Error creating event: ${data.error}`);
    } else {
      setIsModalOpen(false);
      resetForm();
      loadEvents();
    }
  };

  const resetForm = () => {
    setTitle('');
    setAmount('');
    setEventDate('');
    setDeadlineDate('');
    setDescription('');
    setLocation('');
    setCapacity('');
    setEventType('Tournament');
    setHasWaiver(true);
    setFormFields([]);
  };

  if (loading) return <div className="text-xs text-gray-500 font-medium">Loading events...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Events & Gradings</h1>
          <p className="text-xs text-gray-600 mt-0.5">Manage belt gradings, workshops, and tournaments</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-black text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-gray-800 transition shadow-sm cursor-pointer"
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
            <div key={evt.id} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-gray-900">{evt.title}</h3>
                    <span className="text-[10px] bg-gray-100 text-gray-800 px-2 py-0.5 rounded-md font-semibold">
                      {evt.event_type || 'Tournament'}
                    </span>
                  </div>
                  {evt.location && <p className="text-xs text-gray-500 mt-0.5">📍 {evt.location}</p>}
                </div>
                <span className="text-lg font-extrabold text-gray-900">${evt.amount}</span>
              </div>

              {evt.description && <p className="text-xs text-gray-600 line-clamp-2">{evt.description}</p>}

              <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-500 border-t border-gray-100 pt-2">
                <div>📅 Date: {new Date(evt.event_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                {evt.deadline_date && (
                  <div>⏳ Deadline: {new Date(evt.deadline_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div>
                )}
                {evt.form_fields && evt.form_fields.length > 0 && (
                  <div className="col-span-2 font-medium text-gray-700">
                    📋 Custom Fields: {evt.form_fields.length} configured
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full space-y-4 shadow-2xl border border-gray-100 my-8">
            <div className="flex justify-between items-center border-b pb-3">
              <h2 className="text-xl font-bold text-gray-900">Create New Event</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              {/* Event Title & Type */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block font-bold text-gray-900 mb-1">Event Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Goju Karate Konpe 2026 Championship"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-gray-900 focus:ring-2 focus:ring-black"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-900 mb-1">Event Type</label>
                  <select
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-gray-900 focus:ring-2 focus:ring-black"
                  >
                    <option value="Tournament">Tournament</option>
                    <option value="Grading">Grading</option>
                    <option value="Workshop/Seminar">Workshop/Seminar</option>
                  </select>
                </div>
              </div>

              {/* Event Description */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block font-bold text-gray-900">Event Description (Optional)</label>
                  <span className={`text-[10px] ${description.length > 1000 ? 'text-red-600 font-bold' : 'text-gray-400'}`}>
                    {description.length} / 1000
                  </span>
                </div>
                <textarea
                  rows={3}
                  maxLength={1000}
                  placeholder="Provide additional context, division details, uniform requirements, or schedule..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl p-2.5 text-xs text-gray-900 focus:ring-2 focus:ring-black"
                />
              </div>

              {/* Pricing & Dates */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-gray-900 mb-1">Fee ($)</label>
                  <input
                    type="number"
                    required
                    placeholder="90.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-gray-900 focus:ring-2 focus:ring-black"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-900 mb-1">Event Date</label>
                  <input
                    type="date"
                    required
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-gray-900 focus:ring-2 focus:ring-black"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-900 mb-1">Cutoff Deadline</label>
                  <input
                    type="date"
                    value={deadlineDate}
                    onChange={(e) => setDeadlineDate(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-gray-900 focus:ring-2 focus:ring-black"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-900 mb-1">Venue / Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Main Dojo HQ / Community Sports Centre"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-gray-900 focus:ring-2 focus:ring-black"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-900 mb-1">Capacity Limit (Optional)</label>
                  <input
                    type="number"
                    placeholder="e.g. 100"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-gray-900 focus:ring-2 focus:ring-black"
                  />
                </div>
              </div>

              {/* Dynamic Custom Fields Builder */}
              <div className="border-t pt-3 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-extrabold text-gray-700 uppercase tracking-wider text-[10px]">
                    Custom Registration Fields
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleAddField('text')}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold px-2.5 py-1 rounded-lg text-[11px] transition"
                    >
                      + Text Field
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddField('checkbox_group')}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold px-2.5 py-1 rounded-lg text-[11px] transition"
                    >
                      + Checkbox Group
                    </button>
                  </div>
                </div>

                {formFields.length === 0 ? (
                  <p className="text-gray-400 text-[11px] italic bg-gray-50 p-3 rounded-xl text-center">
                    No custom fields added. Parents will only enter standard student details.
                  </p>
                ) : (
                  <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                    {formFields.map((field, idx) => (
                      <div key={field.id} className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-2">
                        <div className="flex justify-between items-center gap-2">
                          <input
                            type="text"
                            value={field.label}
                            onChange={(e) => handleUpdateField(idx, 'label', e.target.value)}
                            className="font-bold border border-gray-300 rounded-lg px-2 py-1 text-xs text-gray-900 flex-1"
                            placeholder="Field Label"
                          />
                          <label className="flex items-center gap-1 text-[11px] text-gray-700 font-semibold">
                            <input
                              type="checkbox"
                              checked={field.required}
                              onChange={(e) => handleUpdateField(idx, 'required', e.target.checked)}
                              className="rounded border-gray-300 text-black"
                            />
                            Required
                          </label>
                          <button
                            type="button"
                            onClick={() => handleRemoveField(idx)}
                            className="text-red-500 hover:text-red-700 font-bold px-1"
                          >
                            ✕
                          </button>
                        </div>

                        {field.type === 'checkbox_group' && (
                          <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">
                              Options (Comma separated)
                            </label>
                            <input
                              type="text"
                              value={field.optionsRaw ?? field.options?.join(', ') ?? ''}
                              onChange={(e) => handleUpdateField(idx, 'optionsRaw', e.target.value)}
                              placeholder="e.g. Kata, Team Kata, Kumite, Bunkai"
                              className="w-full border border-gray-300 rounded-lg px-2 py-1 text-xs text-gray-900"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Liability Waiver Toggle */}
              <div className="border-t pt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="has_waiver" className="font-bold text-gray-900">
                    Require Liability Waiver
                  </label>
                  <input
                    type="checkbox"
                    id="has_waiver"
                    checked={hasWaiver}
                    onChange={(e) => setHasWaiver(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
                  />
                </div>

                {hasWaiver && (
                  <textarea
                    rows={2}
                    value={waiverText}
                    onChange={(e) => setWaiverText(e.target.value)}
                    placeholder="Waiver text displayed during checkout..."
                    className="w-full border border-gray-300 rounded-xl p-2.5 text-xs text-gray-900 focus:ring-2 focus:ring-black"
                  />
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl font-bold text-gray-700 hover:bg-gray-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl font-bold bg-black text-white hover:bg-gray-800 cursor-pointer"
                >
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