// ─── Enums ───────────────────────────────────────────────────────
export enum UserRole {
  DRIVER = 'DRIVER',
  OPS = 'OPS',
  LOCATION_ADMIN = 'LOCATION_ADMIN',
  FLEET_ADMIN = 'FLEET_ADMIN',
}

export enum ReservationStatus {
  HELD = 'HELD',
  CONFIRMED = 'CONFIRMED',
  CHECKED_IN = 'CHECKED_IN',
  COMPLETED = 'COMPLETED',
  CANCELED = 'CANCELED',
  REASSIGNED = 'REASSIGNED',
  FAILED = 'FAILED',
}

export enum CheckInType {
  ARRIVE = 'ARRIVE',
  DEPART = 'DEPART',
}

export enum IncidentType {
  ETA_DRIFT = 'ETA_DRIFT',
  CAPACITY_OVERFLOW = 'CAPACITY_OVERFLOW',
  LOCATION_ISSUE = 'LOCATION_ISSUE',
  MANUAL_OVERRIDE = 'MANUAL_OVERRIDE',
  RESCUE_PROTOCOL = 'RESCUE_PROTOCOL',
}

// ─── DTOs ────────────────────────────────────────────────────────
export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  user: UserSummary;
}

export interface UserSummary {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface CorridorSummary {
  id: string;
  name: string;
  description?: string;
}

export interface LocationSummary {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  corridorId: string;
  timezone: string;
  reliabilityScore: number;
}

export interface LocationCapacitySummary {
  id: string;
  locationId: string;
  date: string;
  totalSpots: number;
  holdbackSpots: number;
  soldSpots: number;
  availableSpots: number; // computed: total - holdback - sold
}

export interface ReservationSummary {
  id: string;
  driverId: string;
  driverName?: string;
  corridorId: string;
  corridorName?: string;
  startEta: string;
  arrivalWindowStart: string;
  arrivalWindowEnd: string;
  primaryLocationId: string;
  primaryLocationName?: string;
  backupLocationId: string;
  backupLocationName?: string;
  emergencyLocationId: string;
  emergencyLocationName?: string;
  status: ReservationStatus;
  confirmationCode: string;
  createdAt: string;
}

export interface CreateReservationDto {
  corridorId: string;
  startEta: string; // ISO datetime
  preferredLocationId?: string;
  hoursRemaining?: number;
}

export interface AllocationResult {
  primaryLocationId: string;
  backupLocationId: string;
  emergencyLocationId: string;
  arrivalWindowStart: string;
  arrivalWindowEnd: string;
}

export interface CheckInDto {
  reservationId: string;
  type: CheckInType;
  lat: number;
  lng: number;
}

export interface CapacityUpdateDto {
  totalSpots?: number;
  holdbackSpots?: number;
}

export interface ReassignDto {
  reservationId: string;
  targetLocationId: string;
  reason?: string;
}

export interface IncidentDto {
  reservationId: string;
  type: IncidentType;
  notes: string;
}

export interface RestCertificatePayload {
  reservationId: string;
  driverName: string;
  locationName: string;
  arrivalTime: string;
  departureTime: string;
  restDurationMinutes: number;
  corridorName: string;
  disclaimer: string;
}

// ─── Notification interfaces (for future Twilio/SendGrid) ───────
export interface NotificationPayload {
  to: string;
  subject?: string;
  body: string;
  channel: 'SMS' | 'EMAIL' | 'PUSH';
}

export interface NotificationService {
  send(payload: NotificationPayload): Promise<{ success: boolean; messageId?: string }>;
}
