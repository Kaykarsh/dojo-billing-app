'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.refresh();
      router.push('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const navItems = [
    { label: 'Overview', href: '/dashboard' },
    { label: 'Pricing Tiers', href: '/dashboard/tiers' },
    { label: 'Students Roster', href: '/dashboard/students' },
    { label: 'Events & Gradings', href: '/dashboard/events' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col justify-between p-6">
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Instructor Portal</h2>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">Dojo Management</p>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block px-3 py-2 rounded-xl text-xs font-semibold transition ${
                    active
                      ? 'bg-black text-white'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <button
          onClick={handleSignOut}
          className="w-full text-left px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer"
        >
          Sign Out
        </button>
      </aside>

      {/* Main Content View */}
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto">{children}</div>
      </main>
    </div>
  );
}