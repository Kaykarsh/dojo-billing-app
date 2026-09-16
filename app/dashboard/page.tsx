'use client';

import { useEffect, useState } from 'react';

interface OverviewStats {
  activeStudentsCount: number;
  pastDueCount: number;
  monthlyRevenue: number;
  businessName: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<OverviewStats>({
    activeStudentsCount: 0,
    pastDueCount: 0,
    monthlyRevenue: 0,
    businessName: '',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const res = await fetch('/api/dashboard/stats');
        if (res.ok) {
          const data = await res.json();
          setStats(data.stats);
        }
      } catch (err) {
        console.error('Error loading dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  if (loading) {
    return <div className="text-xs text-gray-400">Loading metrics...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{stats.businessName}</h1>
        <p className="text-xs text-gray-500 mt-0.5">Performance & Roster Overview</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            Active Enrollments
          </span>
          <p className="text-3xl font-extrabold text-gray-900">{stats.activeStudentsCount}</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            Est. Monthly Revenue
          </span>
          <p className="text-3xl font-extrabold text-gray-900">${stats.monthlyRevenue}</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            Past Due Payments
          </span>
          <p className={`text-3xl font-extrabold ${stats.pastDueCount > 0 ? 'text-red-600' : 'text-gray-900'}`}>
            {stats.pastDueCount}
          </p>
        </div>
      </div>
    </div>
  );
}