import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { haversineDistance } from '../allocation/allocation.service';

const GEOFENCE_RADIUS = parseInt(process.env.GEOFENCE_RADIUS_METERS || '500', 10);

@Injectable()
export class CheckInService {
  constructor(private prisma: PrismaService) {}

  async arrive(reservationId: string, lat: number, lng: number) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { primaryLocation: true },
    });

    if (!reservation) throw new NotFoundException('Reservation not found');
    if (reservation.status !== 'CONFIRMED' && reservation.status !== 'REASSIGNED') {
      throw new BadRequestException('Reservation is not in a checkable state. Status: ' + reservation.status);
    }

    // Geofence check
    const distance = haversineDistance(
      lat, lng,
      reservation.primaryLocation.lat,
      reservation.primaryLocation.lng,
    );

    const confidence = distance <= GEOFENCE_RADIUS ? 1.0 : Math.max(0, 1 - (distance - GEOFENCE_RADIUS) / 5000);

    if (distance > GEOFENCE_RADIUS * 3) {
      throw new BadRequestException(
        `Too far from location. Distance: ${Math.round(distance)}m, max: ${GEOFENCE_RADIUS * 3}m`,
      );
    }

    const event = await this.prisma.checkInEvent.create({
      data: {
        reservationId,
        locationId: reservation.primaryLocationId,
        type: 'ARRIVE',
        lat,
        lng,
        confidence,
      },
    });

    await this.prisma.reservation.update({
      where: { id: reservationId },
      data: { status: 'CHECKED_IN' },
    });

    return { event, distance: Math.round(distance), withinGeofence: distance <= GEOFENCE_RADIUS };
  }

  async depart(reservationId: string, lat: number, lng: number) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { primaryLocation: true },
    });

    if (!reservation) throw new NotFoundException('Reservation not found');
    if (reservation.status !== 'CHECKED_IN') {
      throw new BadRequestException('Must be checked in to depart');
    }

    const event = await this.prisma.checkInEvent.create({
      data: {
        reservationId,
        locationId: reservation.primaryLocationId,
        type: 'DEPART',
        lat,
        lng,
        confidence: 1.0,
      },
    });

    await this.prisma.reservation.update({
      where: { id: reservationId },
      data: { status: 'COMPLETED' },
    });

    return { event };
  }

  async markArrivedByCode(confirmationCode: string, locationId: string) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { confirmationCode },
      include: { primaryLocation: true },
    });

    if (!reservation) throw new NotFoundException('Reservation not found');

    const event = await this.prisma.checkInEvent.create({
      data: {
        reservationId: reservation.id,
        locationId,
        type: 'ARRIVE',
        lat: reservation.primaryLocation.lat,
        lng: reservation.primaryLocation.lng,
        confidence: 1.0,
      },
    });

    await this.prisma.reservation.update({
      where: { id: reservation.id },
      data: { status: 'CHECKED_IN' },
    });

    return { event, reservation };
  }

  /**
   * Validate if coordinates are within geofence of a location.
   * Exported for testing.
   */
  validateGeofence(lat: number, lng: number, locLat: number, locLng: number, radiusMeters: number = GEOFENCE_RADIUS): { distance: number; valid: boolean } {
    const distance = haversineDistance(lat, lng, locLat, locLng);
    return { distance, valid: distance <= radiusMeters };
  }
}
