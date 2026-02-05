'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import StatusBadge from '@/components/StatusBadge';
import dynamic from 'next/dynamic';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

export default function OpsLiveBoard() {
  const [reservations, setReservations] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState('');
  const [selectedRes, setSelectedRes] = useState<any>(null);
  const [reassignTarget, setReassignTarget] = useState('');
  const [incidentNotes, setIncidentNotes] = useState('');

  const load = useCallback(() => {
    Promise.all([
      api.getAllReservations(filter ? { status: filter } : undefined),
      api.getLocations(),
    ]).then(([res, locs]) => {
      setReservations(res);
      setLocations(locs);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 15s
  useEffect(() => {
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [load]);

  const handleReassign = async (resId: string) => {
    if (!reassignTarget) return;
    try {
      await api.reassignReservation(resId, reassignTarget, 'Ops manual reassignment');
      setActionMsg('Reservation reassigned');
      setSelectedRes(null);
      setReassignTarget('');
      load();
    } catch (err: any) {
      setActionMsg(`Error: ${err.message}`);
    }
  };

  const handleRescue = async (resId: string) => {
    try {
      await api.rescueReservation(resId);
      setActionMsg('Rescue protocol executed');
      load();
    } catch (err: any) {
      setActionMsg(`Error: ${err.message}`);
    }
  };

  const handleForceCapacity = async (locId: string) => {
    try {
      await api.forceCapacity(locId);
      setActionMsg('Capacity forced +1');
      load();
    } catch (err: any) {
      setActionMsg(`Error: ${err.message}`);
    }
  };

  const handleCreateIncident = async (resId: string) => {
    if (!incidentNotes.trim()) return;
    try {
      await api.createIncident({ reservationId: resId, type: 'MANUAL_OVERRIDE', notes: incidentNotes });
      setActionMsg('Incident created');
      setIncidentNotes('');
      load();
    } catch (err: any) {
      setActionMsg(`Error: ${err.message}`);
    }
  };

  // Capacity summary
  const capacitySummary = locations.map((loc: any) => {
    const cap = loc.capacities?.[0];
    return {
      id: loc.id,
      name: loc.name,
      total: cap?.totalSpots || 0,
      holdback: cap?.holdbackSpots || 0,
      sold: cap?.soldSpots || 0,
      available: cap ? cap.totalSpots - cap.holdbackSpots - cap.soldSpots : 0,
    };
  });

  const mapLocations = locations.map((l: any) => ({
    id: l.id, name: l.name, lat: l.lat, lng: l.lng, type: 'default' as const,
  }));

  if (loading) return <div className="p-8 text-center">Loading ops board...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Ops Live Board</h1>
        <button onClick={load} className="px-3 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300">Refresh</button>
      </div>

      {actionMsg && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-2 rounded text-sm flex justify-between">
          {actionMsg}
          <button onClick={() => setActionMsg('')} className="text-blue-500 hover:text-blue-700 ml-4">x</button>
        </div>
      )}

      {/* Capacity Bars */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="font-semibold text-lg mb-3">Location Capacity</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {capacitySummary.map((loc) => {
            const pct = loc.total > 0 ? ((loc.sold) / (loc.total - loc.holdback)) * 100 : 0;
            const color = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-500' : 'bg-green-500';
            return (
              <div key={loc.id} className="p-3 bg-gray-50 rounded border">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium truncate">{loc.name}</span>
                  <button onClick={() => handleForceCapacity(loc.id)} className="text-xs text-blue-600 hover:underline">+1</button>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className={`${color} h-2 rounded-full`} style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {loc.sold}/{loc.total - loc.holdback} sold ({loc.holdback} holdback)
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Map */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="font-semibold text-lg mb-3">Corridor Map</h2>
        <MapView locations={mapLocations} height="300px" />
      </div>

      {/* Reservations Table */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-semibold text-lg">Reservations</h2>
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="text-sm border rounded px-2 py-1">
            <option value="">All statuses</option>
            {['HELD', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED', 'CANCELED', 'REASSIGNED', 'FAILED'].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left">Driver</th>
                <th className="px-3 py-2 text-left">Primary Location</th>
                <th className="px-3 py-2 text-left">Window</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Code</th>
                <th className="px-3 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {reservations.map((r: any) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2">{r.driver?.name}</td>
                  <td className="px-3 py-2">{r.primaryLocation?.name}</td>
                  <td className="px-3 py-2 text-xs">
                    {new Date(r.arrivalWindowStart).toLocaleTimeString()} - {new Date(r.arrivalWindowEnd).toLocaleTimeString()}
                  </td>
                  <td className="px-3 py-2"><StatusBadge status={r.status} /></td>
                  <td className="px-3 py-2 font-mono text-xs">{r.confirmationCode}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      {!['COMPLETED', 'CANCELED', 'FAILED'].includes(r.status) && (
                        <>
                          <button
                            onClick={() => setSelectedRes(selectedRes?.id === r.id ? null : r)}
                            className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                          >
                            Reassign
                          </button>
                          <button
                            onClick={() => handleRescue(r.id)}
                            className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                          >
                            Rescue
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reassign Panel */}
      {selectedRes && (
        <div className="bg-white rounded-lg shadow p-6 border-2 border-blue-300">
          <h2 className="font-semibold text-lg mb-3">
            Reassign: {selectedRes.driver?.name} (from {selectedRes.primaryLocation?.name})
          </h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Location</label>
              <select
                value={reassignTarget}
                onChange={(e) => setReassignTarget(e.target.value)}
                className="w-full border rounded px-3 py-2"
              >
                <option value="">Select target location...</option>
                <option value={selectedRes.backupLocationId}>
                  BACKUP: {selectedRes.backupLocation?.name}
                </option>
                <option value={selectedRes.emergencyLocationId}>
                  EMERGENCY: {selectedRes.emergencyLocation?.name}
                </option>
                {locations
                  .filter((l: any) => l.id !== selectedRes.primaryLocationId)
                  .map((l: any) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Incident Notes</label>
              <textarea
                value={incidentNotes}
                onChange={(e) => setIncidentNotes(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm"
                rows={2}
                placeholder="Reason for reassignment..."
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { handleReassign(selectedRes.id); if (incidentNotes) handleCreateIncident(selectedRes.id); }}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
              >
                Confirm Reassign
              </button>
              <button
                onClick={() => { setSelectedRes(null); setReassignTarget(''); setIncidentNotes(''); }}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
