import { CheckInService } from './check-in.service';

describe('CheckInService', () => {
  let service: CheckInService;

  beforeEach(() => {
    // Create service with mock prisma
    service = new CheckInService(null as any);
  });

  describe('validateGeofence', () => {
    it('should validate point within geofence radius', () => {
      // Point at exact location
      const result = service.validateGeofence(40.7128, -74.006, 40.7128, -74.006, 500);
      expect(result.valid).toBe(true);
      expect(result.distance).toBeCloseTo(0, 0);
    });

    it('should reject point outside geofence radius', () => {
      // Point ~10km away
      const result = service.validateGeofence(40.7128, -74.006, 40.8, -74.006, 500);
      expect(result.valid).toBe(false);
      expect(result.distance).toBeGreaterThan(500);
    });

    it('should accept point just within geofence (400m)', () => {
      // Approximately 400m offset (roughly 0.0036 degrees latitude)
      const result = service.validateGeofence(40.7128, -74.006, 40.7164, -74.006, 500);
      expect(result.valid).toBe(true);
      expect(result.distance).toBeLessThan(500);
    });

    it('should work with custom radius', () => {
      // Point ~1km away, with 2km radius
      const result = service.validateGeofence(40.7128, -74.006, 40.7218, -74.006, 2000);
      expect(result.valid).toBe(true);
    });

    it('should reject point just outside geofence', () => {
      // Approximately 600m offset (roughly 0.0054 degrees latitude)
      const result = service.validateGeofence(40.7128, -74.006, 40.7182, -74.006, 500);
      expect(result.valid).toBe(false);
    });
  });
});
