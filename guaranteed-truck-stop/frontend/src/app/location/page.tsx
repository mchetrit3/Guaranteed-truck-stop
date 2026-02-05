'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import StatusBadge from '@/components/StatusBadge';

export default function LocationAdminPage() {
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Capacity editing
  const [editTotal, setEditTotal] = useState<number>(0);
  const [editHoldback, setEditHoldback] = useState<number>(0);

  // Check-in by code
  const [checkInCode, setCheckInCode] = useState('');

  useEffect(() => {
    api.getMyLocations()
      .then((locs) => {
        setLocations(locs);
        if (locs.length > 0) setSelectedLocation(locs[0].id);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const loadReservations = useCallback(() => {
    if (!selectedLocation) return;
    api.getLocationReservations(selectedLocation).then(setReservations).catch(console.error);
  }, [selectedLocation]);

  useEffect(() => { loadReservations(); }, [loadReservations]);

  useEffect(() => {
    const loc = locations.find((l) => l.id === selectedLocation);
    if (loc?.capacities?.[0]) {
      setEditTotal(loc.capacities[0].totalSpots);
      setEditHoldback(loc.capacities[0].holdbackSpots);
    }
  }, [selectedLocation, locations]);

  const handleUpdateCapacity = async () => {
    setError('');
    try {
      const today = new Date().toISOString().split('T')[0];
      await api.updateCapacity(selectedLocation, today, { totalSpots: editTotal, holdbackSpots: editHoldback });
      setMessage('Capacity updated');
      // Reload locations
      const locs = await api.getMyLocations();
      setLocations(locs);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCheckInByCode = async () => {
    if (!checkInCode.trim()) return;
    setError('');
    try {
      await api.locationCheckIn({ confirmationCode: checkInCode.trim(), locationId: selectedLocation });
      setMessage(`Driver checked in with code ${checkInCode}`);
      setCheckInCode('');
      loadReservations();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleFlagIssue = async () => {
    if (reservations.length === 0) return;
    try {
      // Flag first active reservation as having an issue
      const activeRes = reservations.find((r) => ['CONFIRMED', 'CHECKED_IN'].includes(r.status));
      if (activeRes) {
        await api.createIncident({
          reservationId: activeRes.id,
          type: 'LOCATION_ISSUE',
          notes: `Issue flagged at ${locations.find((l) => l.id === selectedLocation)?.name}`,
        });
        setMessage('Issue flagged - Ops notified');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const selectedLoc = locations.find((l) => l.id === selectedLocation);
  const cap = selectedLoc?.capacities?.[0];

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  if (locations.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
        No locations assigned to your account.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Location Admin</h1>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">{error}</div>}
      {message && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded text-sm">{message}</div>}

      {/* Location Selector */}
      <div className="bg-white rounded-lg shadow p-4">
        <select
          value={selectedLocation}
          onChange={(e) => setSelectedLocation(e.target.value)}
          className="w-full border rounded px-3 py-2 font-medium"
        >
          {locations.map((loc) => (
            <option key={loc.id} value={loc.id}>{loc.name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Capacity Management */}
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="font-semibold text-lg">Capacity Management</h2>
          {cap && (
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-blue-50 rounded">
                <div className="text-2xl font-bold text-blue-900">{cap.totalSpots}</div>
                <div className="text-xs text-blue-600">Total</div>
              </div>
              <div className="p-3 bg-yellow-50 rounded">
                <div className="text-2xl font-bold text-yellow-900">{cap.holdbackSpots}</div>
                <div className="text-xs text-yellow-600">Holdback</div>
              </div>
              <div className="p-3 bg-green-50 rounded">
                <div className="text-2xl font-bold text-green-900">{cap.totalSpots - cap.holdbackSpots - cap.soldSpots}</div>
                <div className="text-xs text-green-600">Available</div>
              </div>
            </div>
          )}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-gray-500">Total Spots</label>
              <input
                type="number"
                value={editTotal}
                onChange={(e) => setEditTotal(parseInt(e.target.value) || 0)}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-500">Holdback</label>
              <input
                type="number"
                value={editHoldback}
                onChange={(e) => setEditHoldback(parseInt(e.target.value) || 0)}
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>
          <button onClick={handleUpdateCapacity} className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">
            Update Capacity
          </button>
        </div>

        {/* Check-in by Code + Flag Issue */}
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="font-semibold text-lg">Check-In Driver</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={checkInCode}
              onChange={(e) => setCheckInCode(e.target.value.toUpperCase())}
              placeholder="GTS-XXXXXX"
              className="flex-1 border rounded px-3 py-2 font-mono"
            />
            <button onClick={handleCheckInByCode} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm">
              Check In
            </button>
          </div>

          <button
            onClick={handleFlagIssue}
            className="w-full py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm border border-red-200"
          >
            Flag Overflow / Issue (Notify Ops)
          </button>
        </div>
      </div>

      {/* Tonight's Reservations */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="font-semibold text-lg mb-3">Today&apos;s Reservations ({reservations.length})</h2>
        {reservations.length === 0 ? (
          <div className="text-gray-500 text-sm">No reservations for today.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">Driver</th>
                  <th className="px-3 py-2 text-left">Arrival Window</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Code</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {reservations.map((r: any) => (
                  <tr key={r.id}>
                    <td className="px-3 py-2">{r.driver?.name}</td>
                    <td className="px-3 py-2 text-xs">
                      {new Date(r.arrivalWindowStart).toLocaleTimeString()} - {new Date(r.arrivalWindowEnd).toLocaleTimeString()}
                    </td>
                    <td className="px-3 py-2"><StatusBadge status={r.status} /></td>
                    <td className="px-3 py-2 font-mono text-xs">{r.confirmationCode}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
