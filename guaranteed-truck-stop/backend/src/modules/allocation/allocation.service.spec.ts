import { haversineDistance } from './allocation.service';

describe('AllocationService', () => {
  describe('haversineDistance', () => {
    it('should return 0 for identical points', () => {
      const d = haversineDistance(40.7128, -74.006, 40.7128, -74.006);
      expect(d).toBeCloseTo(0, 0);
    });

    it('should calculate correct distance between NYC and Philadelphia (~130km)', () => {
      // NYC (40.7128, -74.006) to Philadelphia (39.9526, -75.1652)
      const d = haversineDistance(40.7128, -74.006, 39.9526, -75.1652);
      // Should be approximately 130km (130000m)
      expect(d).toBeGreaterThan(120000);
      expect(d).toBeLessThan(140000);
    });

    it('should calculate correct distance between nearby points (~1km)', () => {
      // Two points about 1km apart
      const d = haversineDistance(40.7128, -74.006, 40.7218, -74.006);
      expect(d).toBeGreaterThan(900);
      expect(d).toBeLessThan(1100);
    });

    it('should be symmetric', () => {
      const d1 = haversineDistance(40.7128, -74.006, 39.9526, -75.1652);
      const d2 = haversineDistance(39.9526, -75.1652, 40.7128, -74.006);
      expect(d1).toBeCloseTo(d2, 0);
    });

    it('should handle large distances (Boston to Washington DC ~630km)', () => {
      const d = haversineDistance(42.3601, -71.0589, 38.9072, -77.0369);
      expect(d).toBeGreaterThan(600000);
      expect(d).toBeLessThan(660000);
    });
  });
});
