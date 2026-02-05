'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import dynamic from 'next/dynamic';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

export default function DriverDashboard() {
  const router = useRouter();
  const [corridors, setCorridors] = useState<any[]>([]);
  const [hos, setHos] = useState<any>(null);
  const [selectedCorridor, setSelectedCorridor] = useState<string>('');
  const [locations, setLocations] = useState<any[]>([]);
  const [preferredLocation, setPreferredLocation] = useState<string>('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [recentReservations, setRecentReservations] = useState<any[]>([]);

  useEffect(() => {
    api.getCorridors().then(setCorridors).catch(console.error);
    api.getHos().then(setHos).catch(console.error);
    api.getMyReservations().then((r) => setRecentReservations(r.slice(0, 3))).catch(console.error);
  }, []);

  useEffect(() => {
    if (selectedCorridor) {
      api.getLocations(selectedCorridor).then(setLocations).catch(console.error);
    }
  }, [selectedCorridor]);

  // HOS countdown
  const [countdown, setCountdown] = useState('');
  useEffect(() => {
    if (!hos) return;
    const interval = setInterval(() => {
      const remaining = new Date(hos.latestStopTime).getTime() - Date.now();
      if (remaining <= 0) { setCountdown('00:00:00'); return; }
      const h = Math.floor(remaining / 3600000);
      const m = Math.floor((remaining % 3600000) / 60000);
      const s = Math.floor((remaining % 60000) / 1000);
      setCountdown(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [hos]);

  const handleReserve = async () => {
    if (!selectedCorridor) { setError('Select a corridor'); return; }
    setError('');
    setCreating(true);
    try {
      const eta = new Date(Date.now() + (hos?.hoursRemaining || 3.5) * 60 * 60 * 1000).toISOString();
      const res = await api.createReservation({
        corridorId: selectedCorridor,
        startEta: eta,
        preferredLocationId: preferredLocation || undefined,
        hoursRemaining: hos?.hoursRemaining,
      });
      router.push(`/driver/reservations/${res.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const mapLocations = locations.map((l: any) => ({
    id: l.id,
    name: l.name,
    lat: l.lat,
    lng: l.lng,
    type: l.id === preferredLocation ? 'primary' as const : 'default' as const,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Driver Dashboard</h1>
        {hos && (
          <div className={`text-right ${hos.hoursRemaining < 2 ? 'text-red-600' : 'text-gray-900'}`}>
            <div className="text-xs text-gray-500 uppercase">Drive Time Remaining</div>
            <div className="text-3xl font-mono font-bold">{countdown || '--:--:--'}</div>
            <div className="text-xs text-gray-400">{hos.disclaimer}</div>
          </div>
        )}
      </div>

      {/* Reserve a Stop */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h2 className="text-lg font-semibold">Reserve a Guaranteed Stop</h2>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">{error}</div>}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Select Corridor</label>
          <select
            value={selectedCorridor}
            onChange={(e) => { setSelectedCorridor(e.target.value); setPreferredLocation(''); }}
            className="w-full rounded-md border border-gray-300 px-3 py-2"
          >
            <option value="">Choose a corridor...</option>
            {corridors.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {locations.length > 0 && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Stop (optional)</label>
              <select
                value={preferredLocation}
                onChange={(e) => setPreferredLocation(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              >
                <option value="">Auto-assign best option</option>
                {locations.map((l: any) => {
                  const cap = l.capacities?.[0];
                  const avail = cap ? cap.totalSpots - cap.holdbackSpots - cap.soldSpots : '?';
                  return (
                    <option key={l.id} value={l.id}>
                      {l.name} ({avail} spots available)
                    </option>
                  );
                })}
              </select>
            </div>

            <MapView
              locations={mapLocations}
              highlightId={preferredLocation}
              geofenceRadius={500}
              height="300px"
              onLocationClick={(id) => setPreferredLocation(id)}
            />
          </>
        )}

        <button
          onClick={handleReserve}
          disabled={creating || !selectedCorridor}
          className="w-full py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 font-semibold text-lg"
        >
          {creating ? 'Reserving...' : 'Reserve Guaranteed Stop'}
        </button>
      </div>

      {/* Recent Reservations */}
      {recentReservations.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold">Recent Reservations</h2>
            <button onClick={() => router.push('/driver/reservations')} className="text-sm text-blue-600 hover:underline">
              View all
            </button>
          </div>
          <div className="space-y-2">
            {recentReservations.map((r: any) => (
              <button
                key={r.id}
                onClick={() => router.push(`/driver/reservations/${r.id}`)}
                className="w-full text-left p-3 bg-gray-50 rounded hover:bg-gray-100 flex justify-between items-center"
              >
                <div>
                  <span className="font-medium">{r.primaryLocation?.name}</span>
                  <span className="text-sm text-gray-500 ml-2">{r.corridor?.name}</span>
                </div>
                <span className={`status-badge status-${r.status}`}>{r.status}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
