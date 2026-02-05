'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

export default function FleetPage() {
  const [fleets, setFleets] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [selectedFleet, setSelectedFleet] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getMyFleets()
      .then((f) => {
        setFleets(f);
        if (f.length > 0) setSelectedFleet(f[0].fleetId || f[0].fleet?.id);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selectedFleet) {
      api.getFleetMembers(selectedFleet).then(setMembers).catch(console.error);
    }
  }, [selectedFleet]);

  if (loading) return <div className="p-8 text-center">Loading fleet data...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Fleet Overview</h1>
      <span className="text-sm text-gray-500 bg-yellow-50 px-2 py-1 rounded">Read-only in beta</span>

      {fleets.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          No fleets associated with your account.
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow p-4">
            <select
              value={selectedFleet}
              onChange={(e) => setSelectedFleet(e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              {fleets.map((f: any) => (
                <option key={f.fleet?.id || f.fleetId} value={f.fleet?.id || f.fleetId}>
                  {f.fleet?.name || 'Fleet'}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="font-semibold text-lg mb-3">Fleet Members ({members.length})</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Name</th>
                    <th className="px-3 py-2 text-left">Role</th>
                    <th className="px-3 py-2 text-left">Carrier</th>
                    <th className="px-3 py-2 text-left">Home Base</th>
                    <th className="px-3 py-2 text-left">ELD</th>
                    <th className="px-3 py-2 text-left">Hours Remaining</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {members.map((m: any) => (
                    <tr key={m.id}>
                      <td className="px-3 py-2 font-medium">{m.user?.name}</td>
                      <td className="px-3 py-2">
                        <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{m.user?.role}</span>
                      </td>
                      <td className="px-3 py-2">{m.user?.driverProfile?.carrierName || '-'}</td>
                      <td className="px-3 py-2">{m.user?.driverProfile?.homeBase || '-'}</td>
                      <td className="px-3 py-2">{m.user?.driverProfile?.eldProvider || '-'}</td>
                      <td className="px-3 py-2">
                        {m.user?.driverProfile?.hoursRemaining != null
                          ? `${m.user.driverProfile.hoursRemaining}h`
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
