import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AllocationResult {
  primaryLocationId: string;
  backupLocationId: string;
  emergencyLocationId: string;
  arrivalWindowStart: Date;
  arrivalWindowEnd: Date;
}

/**
 * Haversine distance in meters between two lat/lng points.
 * Used for geofence validation and nearest-location ranking.
 */
export function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

@Injectable()
export class AllocationService {
  constructor(private prisma: PrismaService) {}

  /**
   * Allocate primary, backup, and emergency locations for a reservation.
   * Strategy: rank corridor locations by order, find locations with available
   * capacity (total - holdback - sold > 0), pick top 3 nearest to preferred/ETA position.
   */
  async allocate(
    corridorId: string,
    startEta: Date,
    preferredLocationId?: string,
    hoursRemaining: number = 3.5,
  ): Promise<AllocationResult> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all locations in corridor with today's capacity
    const locations = await this.prisma.location.findMany({
      where: { corridorId },
      orderBy: { orderInCorridor: 'asc' },
      include: {
        capacities: {
          where: { date: today },
        },
      },
    });

    if (locations.length < 3) {
      throw new BadRequestException('Corridor needs at least 3 locations for reservation');
    }

    // Filter to locations with available capacity
    const available = locations.filter((loc) => {
      const cap = loc.capacities[0];
      if (!cap) return true; // No capacity record = assume available
      return cap.totalSpots - cap.holdbackSpots - cap.soldSpots > 0;
    });

    if (available.length < 3) {
      throw new BadRequestException('Insufficient capacity across corridor. Only ' + available.length + ' locations available.');
    }

    // If preferred location specified, try to use it as primary
    let primary: typeof locations[0] | undefined;
    let ranked = [...available];

    if (preferredLocationId) {
      primary = available.find((l) => l.id === preferredLocationId);
      if (primary) {
        ranked = available.filter((l) => l.id !== primary!.id);
      }
    }

    if (!primary) {
      // Pick location closest to midpoint of corridor order as primary
      primary = available[Math.floor(available.length / 2)];
      ranked = available.filter((l) => l.id !== primary!.id);
    }

    // Rank remaining by distance from primary (use corridor order as proxy)
    ranked.sort((a, b) => {
      const distA = Math.abs(a.orderInCorridor - primary!.orderInCorridor);
      const distB = Math.abs(b.orderInCorridor - primary!.orderInCorridor);
      return distA - distB;
    });

    const backup = ranked[0];
    const emergency = ranked[1];

    // Calculate arrival window: 30 min before/after ETA
    const arrivalWindowStart = new Date(startEta.getTime() - 30 * 60 * 1000);
    const arrivalWindowEnd = new Date(startEta.getTime() + 30 * 60 * 1000);

    return {
      primaryLocationId: primary.id,
      backupLocationId: backup.id,
      emergencyLocationId: emergency.id,
      arrivalWindowStart,
      arrivalWindowEnd,
    };
  }

  /**
   * Check if a location has capacity available (excluding holdback).
   */
  async hasCapacity(locationId: string): Promise<boolean> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const cap = await this.prisma.locationCapacity.findUnique({
      where: { locationId_date: { locationId, date: today } },
    });

    if (!cap) return true; // No record = assume available
    return cap.totalSpots - cap.holdbackSpots - cap.soldSpots > 0;
  }

  /**
   * Increment sold spots for a location.
   */
  async incrementSold(locationId: string): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await this.prisma.locationCapacity.upsert({
      where: { locationId_date: { locationId, date: today } },
      update: { soldSpots: { increment: 1 } },
      create: {
        locationId,
        date: today,
        totalSpots: 20,
        holdbackSpots: 2,
        soldSpots: 1,
      },
    });
  }

  /**
   * Decrement sold spots (for cancellation/reassignment).
   */
  async decrementSold(locationId: string): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const cap = await this.prisma.locationCapacity.findUnique({
      where: { locationId_date: { locationId, date: today } },
    });

    if (cap && cap.soldSpots > 0) {
      await this.prisma.locationCapacity.update({
        where: { id: cap.id },
        data: { soldSpots: { decrement: 1 } },
      });
    }
  }
}
