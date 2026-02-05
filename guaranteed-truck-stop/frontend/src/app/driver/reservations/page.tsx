'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import StatusBadge from '@/components/StatusBadge';

export default function DriverReservations() {
  const router = useRouter();
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getMyReservations()
      .then(setReservations)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-center">Loading reservations...</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">My Reservations</h1>

      {reservations.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          <p>No reservations yet.</p>
          <button onClick={() => router.push('/driver')} className="mt-4 text-blue-600 hover:underline">
            Reserve a stop
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow divide-y">
          {reservations.map((r: any) => (
            <button
              key={r.id}
              onClick={() => router.push(`/driver/reservations/${r.id}`)}
              className="w-full text-left p-4 hover:bg-gray-50 flex justify-between items-center"
            >
              <div>
                <div className="font-medium text-gray-900">{r.primaryLocation?.name}</div>
                <div className="text-sm text-gray-500">
                  {r.corridor?.name} &middot; {new Date(r.arrivalWindowStart).toLocaleString()} - {new Date(r.arrivalWindowEnd).toLocaleTimeString()}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  Backup: {r.backupLocation?.name} &middot; Emergency: {r.emergencyLocation?.name}
                </div>
              </div>
              <StatusBadge status={r.status} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
