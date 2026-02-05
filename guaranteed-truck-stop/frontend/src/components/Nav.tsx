'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

const ROLE_NAV: Record<string, { label: string; href: string }[]> = {
  DRIVER: [
    { label: 'Dashboard', href: '/driver' },
    { label: 'My Reservations', href: '/driver/reservations' },
  ],
  OPS: [
    { label: 'Live Board', href: '/ops' },
    { label: 'Incidents', href: '/ops/incidents' },
  ],
  LOCATION_ADMIN: [
    { label: 'My Locations', href: '/location' },
  ],
  FLEET_ADMIN: [
    { label: 'Fleet Overview', href: '/fleet' },
  ],
};

export default function Nav() {
  const { user, logout } = useAuth();
  const router = useRouter();

  if (!user) return null;

  const links = ROLE_NAV[user.role] || [];

  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-bold text-lg text-gray-900">
            GTS
            <span className="ml-1 text-xs bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded-full">BETA</span>
          </Link>
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-sm text-gray-600 hover:text-gray-900">
              {l.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">
            {user.name} <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{user.role}</span>
          </span>
          <button
            onClick={() => { logout(); router.push('/login'); }}
            className="text-sm text-red-600 hover:text-red-800"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
