'use client';

import { useEffect, useState } from 'react';

interface StudentRecord {
  id: string;
  student_name: string;
  parent_name: string;
  parent_email: string;
  parent_mobile: string;
  joining_fee_paid: boolean;
  created_at: string;
  enrollments: {
    id: string;
    payment_cadence: string;
    amount_paid: number;
    status: string;
    pricing_tiers: {
      name: string;
      billing_interval: string;
    } | null;
  }[];
}

export default function StudentRosterPage() {
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const loadStudents = async () => {
    try {
      const res = await fetch('/api/students');
      if (res.ok) {
        const data = await res.json();
        setStudents(data.students || []);
      }
    } catch (err) {
      console.error('Failed to load students:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);

  const filteredStudents = students.filter(
    (s) =>
      s.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.parent_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.parent_email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="text-xs text-gray-500 font-medium">Loading student roster...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Student Roster</h1>
          <p className="text-xs text-gray-600 mt-0.5">
            View active enrollments, parent contact info, and payment statuses
          </p>
        </div>

        <div className="w-full sm:w-64">
          <input
            type="text"
            placeholder="Search student or parent..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white text-gray-900 border border-gray-300 rounded-xl px-3 py-2 text-xs font-medium placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-black shadow-sm"
          />
        </div>
      </div>

      {filteredStudents.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center space-y-2 shadow-sm">
          <p className="text-sm font-bold text-gray-900">No students found</p>
          <p className="text-xs text-gray-600 max-w-sm mx-auto">
            {searchTerm
              ? 'No records match your search query.'
              : 'Enrolled students will automatically appear here once parents complete checkout.'}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase tracking-wider font-bold text-[10px]">
                <tr>
                  <th className="px-5 py-3.5">Student</th>
                  <th className="px-5 py-3.5">Parent / Guardian</th>
                  <th className="px-5 py-3.5">Enrolled Plan</th>
                  <th className="px-5 py-3.5">Cadence</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Enrolled Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-800">
                {filteredStudents.map((student) => {
                  const activeEnrollment = student.enrollments?.[0];
                  const tierName = activeEnrollment?.pricing_tiers?.name || 'Standard Plan';
                  const cadence = activeEnrollment?.payment_cadence || 'recurring';
                  const status = activeEnrollment?.status || 'active';

                  return (
                    <tr key={student.id} className="hover:bg-gray-50/50 transition">
                      <td className="px-5 py-4 font-bold text-gray-900">{student.student_name}</td>
                      <td className="px-5 py-4">
                        <div className="font-semibold text-gray-900">{student.parent_name}</div>
                        <div className="text-[11px] text-gray-500">{student.parent_email}</div>
                        <div className="text-[11px] text-gray-400">{student.parent_mobile}</div>
                      </td>
                      <td className="px-5 py-4 font-semibold text-gray-900">{tierName}</td>
                      <td className="px-5 py-4">
                        <span className="capitalize font-medium text-gray-700">
                          {cadence === 'term_upfront' ? 'Term Upfront' : 'Instalments'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-gray-500 font-medium">
                        {new Date(student.created_at).toLocaleDateString('en-AU', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}