'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import StatusBadge from '@/components/StatusBadge';
import dynamic from 'next/dynamic';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

export default function ReservationDetail() {
  const { id } = useParams();
  const [res, setRes] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = () => {
    api.getReservation(id as string)
      .then(setRes)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const handleCheckIn = async (type: 'ARRIVE' | 'DEPART') => {
    setActionLoading(true);
    setError('');
    setMessage('');
    try {
      // Try to get real location, fall back to location coords
      let lat = res.primaryLocation.lat;
      let lng = res.primaryLocation.lng;

      if (navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
          });
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        } catch {
          // Use location coords as fallback (demo-friendly)
        }
      }

      const result = await api.driverCheckIn({ reservationId: id as string, type, lat, lng });
      setMessage(
        type === 'ARRIVE'
          ? `Checked in! Distance: ${result.distance}m ${result.withinGeofence ? '(within geofence)' : '(outside geofence, recorded with lower confidence)'}`
          : 'Checked out successfully!'
      );
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    setActionLoading(true);
    try {
      await api.cancelReservation(id as string);
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenerateCert = async () => {
    setActionLoading(true);
    try {
      const result = await api.generateCertificate(id as string);
      const blob = await api.downloadCertificatePdf(result.certificate.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rest-certificate-${result.certificate.id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage('Certificate downloaded!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!res) return <div className="p-8 text-center text-red-600">Reservation not found</div>;

  const mapLocations = [
    { id: res.primaryLocation.id, name: `PRIMARY: ${res.primaryLocation.name}`, lat: res.primaryLocation.lat, lng: res.primaryLocation.lng, type: 'primary' as const },
    { id: res.backupLocation.id, name: `BACKUP: ${res.backupLocation.name}`, lat: res.backupLocation.lat, lng: res.backupLocation.lng, type: 'backup' as const },
    { id: res.emergencyLocation.id, name: `EMERGENCY: ${res.emergencyLocation.name}`, lat: res.emergencyLocation.lat, lng: res.emergencyLocation.lng, type: 'emergency' as const },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Reservation</h1>
        <StatusBadge status={res.status} />
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">{error}</div>}
      {message && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded text-sm">{message}</div>}

      {/* Confirmation Code */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 text-center">
        <div className="text-sm text-blue-600 uppercase font-medium">Confirmation Code</div>
        <div className="text-4xl font-mono font-bold text-blue-900 my-2">{res.confirmationCode}</div>
        <div className="text-sm text-blue-600">Show this to the location attendant</div>
      </div>

      {/* Location Details */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h2 className="font-semibold text-lg">Assigned Locations</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="p-3 bg-blue-50 rounded border border-blue-200">
            <div className="text-xs text-blue-600 uppercase font-medium">Primary</div>
            <div className="font-medium">{res.primaryLocation.name}</div>
            <div className="text-xs text-gray-500">{res.primaryLocation.address}</div>
          </div>
          <div className="p-3 bg-yellow-50 rounded border border-yellow-200">
            <div className="text-xs text-yellow-600 uppercase font-medium">Backup</div>
            <div className="font-medium">{res.backupLocation.name}</div>
            <div className="text-xs text-gray-500">{res.backupLocation.address}</div>
          </div>
          <div className="p-3 bg-red-50 rounded border border-red-200">
            <div className="text-xs text-red-600 uppercase font-medium">Emergency</div>
            <div className="font-medium">{res.emergencyLocation.name}</div>
            <div className="text-xs text-gray-500">{res.emergencyLocation.address}</div>
          </div>
        </div>

        <MapView locations={mapLocations} highlightId={res.primaryLocation.id} geofenceRadius={500} height="300px" />
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="font-semibold text-lg mb-3">Timeline</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between py-1 border-b">
            <span className="text-gray-500">Created</span>
            <span>{new Date(res.createdAt).toLocaleString()}</span>
          </div>
          <div className="flex justify-between py-1 border-b">
            <span className="text-gray-500">Arrival Window</span>
            <span>{new Date(res.arrivalWindowStart).toLocaleTimeString()} - {new Date(res.arrivalWindowEnd).toLocaleTimeString()}</span>
          </div>
          {res.checkInEvents?.map((e: any) => (
            <div key={e.id} className="flex justify-between py-1 border-b">
              <span className={e.type === 'ARRIVE' ? 'text-green-600' : 'text-blue-600'}>
                {e.type === 'ARRIVE' ? 'Arrived' : 'Departed'}
              </span>
              <span>{new Date(e.ts).toLocaleString()}</span>
            </div>
          ))}
          {res.incidents?.map((i: any) => (
            <div key={i.id} className="flex justify-between py-1 border-b text-orange-600">
              <span>Incident: {i.type}</span>
              <span>{i.notes}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white rounded-lg shadow p-6 space-y-3">
        <h2 className="font-semibold text-lg">Actions</h2>
        <div className="flex flex-wrap gap-3">
          {(res.status === 'CONFIRMED' || res.status === 'REASSIGNED') && (
            <button
              onClick={() => handleCheckIn('ARRIVE')}
              disabled={actionLoading}
              className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 font-semibold"
            >
              I&apos;ve Arrived
            </button>
          )}

          {res.status === 'CHECKED_IN' && (
            <>
              <button
                onClick={() => handleCheckIn('DEPART')}
                disabled={actionLoading}
                className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 font-semibold"
              >
                Departed
              </button>
            </>
          )}

          {res.status === 'COMPLETED' && (
            <button
              onClick={handleGenerateCert}
              disabled={actionLoading}
              className="px-6 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 font-semibold"
            >
              Download Rest Certificate (PDF)
            </button>
          )}

          {!['COMPLETED', 'CANCELED', 'FAILED'].includes(res.status) && (
            <button
              onClick={handleCancel}
              disabled={actionLoading}
              className="px-6 py-3 bg-red-100 text-red-700 rounded-md hover:bg-red-200 disabled:opacity-50"
            >
              Cancel Reservation
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
