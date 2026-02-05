'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getIncidents(50)
      .then(setIncidents)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-center">Loading incidents...</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Incidents</h1>

      {incidents.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          No incidents recorded yet.
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow divide-y">
          {incidents.map((inc: any) => (
            <div key={inc.id} className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium mr-2 ${
                    inc.type === 'RESCUE_PROTOCOL' ? 'bg-red-100 text-red-700' :
                    inc.type === 'ETA_DRIFT' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {inc.type}
                  </span>
                  <span className="text-sm text-gray-900">{inc.notes}</span>
                </div>
                <span className="text-xs text-gray-500">{new Date(inc.createdAt).toLocaleString()}</span>
              </div>
              <div className="mt-1 text-xs text-gray-500">
                Driver: {inc.reservation?.driver?.name} | Location: {inc.reservation?.primaryLocation?.name} | By: {inc.createdBy?.name}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
