'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push('/login'); return; }
    switch (user.role) {
      case 'DRIVER': router.push('/driver'); break;
      case 'OPS': router.push('/ops'); break;
      case 'LOCATION_ADMIN': router.push('/location'); break;
      case 'FLEET_ADMIN': router.push('/fleet'); break;
      default: router.push('/login');
    }
  }, [user, loading, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Guaranteed Truck Stop</h1>
        <p className="text-gray-500">Loading...</p>
      </div>
    </div>
  );
}
