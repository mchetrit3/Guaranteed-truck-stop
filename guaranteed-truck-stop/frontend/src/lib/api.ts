const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) localStorage.setItem('gts_token', token);
      else localStorage.removeItem('gts_token');
    }
  }

  getToken(): string | null {
    if (this.token) return this.token;
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('gts_token');
    }
    return this.token;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_URL}/api${path}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(body.message || `API Error: ${res.status}`);
    }

    if (res.headers.get('content-type')?.includes('application/pdf')) {
      return res.blob() as any;
    }

    return res.json();
  }

  // Auth
  login(email: string, password: string) {
    return this.request<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  register(data: { email: string; password: string; name: string; role: string; phone?: string }) {
    return this.request<any>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Users
  getMe() { return this.request<any>('/users/me'); }
  getMyProfile() { return this.request<any>('/users/me/profile'); }
  updateProfile(data: any) { return this.request<any>('/users/me/profile', { method: 'PUT', body: JSON.stringify(data) }); }
  getMyFleets() { return this.request<any>('/users/fleets'); }
  getFleetMembers(fleetId: string) { return this.request<any>(`/users/fleets/${fleetId}/members`); }

  // Corridors
  getCorridors() { return this.request<any[]>('/corridors'); }
  getCorridor(id: string) { return this.request<any>(`/corridors/${id}`); }

  // Locations
  getLocations(corridorId?: string) {
    const q = corridorId ? `?corridorId=${corridorId}` : '';
    return this.request<any[]>(`/locations${q}`);
  }
  getMyLocations() { return this.request<any[]>('/locations/mine'); }
  getLocation(id: string) { return this.request<any>(`/locations/${id}`); }
  getLocationReservations(id: string, date?: string) {
    const q = date ? `?date=${date}` : '';
    return this.request<any[]>(`/locations/${id}/reservations${q}`);
  }
  updateCapacity(locationId: string, date: string, data: { totalSpots?: number; holdbackSpots?: number }) {
    return this.request<any>(`/locations/${locationId}/capacity?date=${date}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Reservations
  createReservation(data: { corridorId: string; startEta: string; preferredLocationId?: string; hoursRemaining?: number }) {
    return this.request<any>('/reservations', { method: 'POST', body: JSON.stringify(data) });
  }
  getMyReservations() { return this.request<any[]>('/reservations/mine'); }
  getAllReservations(filters?: { status?: string; corridorId?: string; locationId?: string }) {
    const params = new URLSearchParams();
    if (filters?.status) params.set('status', filters.status);
    if (filters?.corridorId) params.set('corridorId', filters.corridorId);
    if (filters?.locationId) params.set('locationId', filters.locationId);
    const q = params.toString() ? `?${params}` : '';
    return this.request<any[]>(`/reservations${q}`);
  }
  getReservation(id: string) { return this.request<any>(`/reservations/${id}`); }
  getReservationByCode(code: string) { return this.request<any>(`/reservations/code/${code}`); }
  cancelReservation(id: string) { return this.request<any>(`/reservations/${id}/cancel`, { method: 'PUT' }); }
  reassignReservation(id: string, targetLocationId: string, reason?: string) {
    return this.request<any>(`/reservations/${id}/reassign`, {
      method: 'PUT',
      body: JSON.stringify({ targetLocationId, reason }),
    });
  }
  rescueReservation(id: string) { return this.request<any>(`/reservations/${id}/rescue`, { method: 'PUT' }); }
  forceCapacity(locationId: string) { return this.request<any>(`/reservations/locations/${locationId}/force-capacity`, { method: 'PUT' }); }

  // Check-in
  driverCheckIn(data: { reservationId: string; type: 'ARRIVE' | 'DEPART'; lat: number; lng: number }) {
    return this.request<any>('/check-in/driver', { method: 'POST', body: JSON.stringify(data) });
  }
  locationCheckIn(data: { confirmationCode: string; locationId: string }) {
    return this.request<any>('/check-in/location', { method: 'POST', body: JSON.stringify(data) });
  }

  // HOS
  getHos() { return this.request<any>('/hos'); }
  updateHos(hoursRemaining: number) { return this.request<any>('/hos', { method: 'PUT', body: JSON.stringify({ hoursRemaining }) }); }

  // Incidents
  createIncident(data: { reservationId: string; type: string; notes: string }) {
    return this.request<any>('/incidents', { method: 'POST', body: JSON.stringify(data) });
  }
  getIncidents(limit?: number) { return this.request<any[]>(`/incidents${limit ? `?limit=${limit}` : ''}`); }

  // Certificates
  generateCertificate(reservationId: string) {
    return this.request<any>(`/certificates/generate/${reservationId}`, { method: 'POST' });
  }
  downloadCertificatePdf(certId: string) {
    const token = this.getToken();
    return fetch(`${API_URL}/api/certificates/${certId}/pdf`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.blob());
  }
}

export const api = new ApiClient();
