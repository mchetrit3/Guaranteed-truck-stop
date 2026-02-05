import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LocationsService {
  constructor(private prisma: PrismaService) {}

  async findAll(corridorId?: string) {
    return this.prisma.location.findMany({
      where: corridorId ? { corridorId } : undefined,
      orderBy: { orderInCorridor: 'asc' },
      include: {
        capacities: {
          where: {
            date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
          },
          orderBy: { date: 'asc' },
          take: 2,
        },
      },
    });
  }

  async findById(id: string) {
    const loc = await this.prisma.location.findUnique({
      where: { id },
      include: {
        capacities: {
          where: {
            date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
          },
          orderBy: { date: 'asc' },
          take: 2,
        },
      },
    });
    if (!loc) throw new NotFoundException('Location not found');
    return loc;
  }

  async getReservationsForLocation(locationId: string, date?: string) {
    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    return this.prisma.reservation.findMany({
      where: {
        primaryLocationId: locationId,
        arrivalWindowStart: { gte: startOfDay, lte: endOfDay },
        status: { notIn: ['CANCELED', 'FAILED'] },
      },
      include: {
        driver: { select: { id: true, name: true, phone: true } },
      },
      orderBy: { arrivalWindowStart: 'asc' },
    });
  }

  async updateCapacity(
    locationId: string,
    date: string,
    userId: string,
    userRole: string,
    data: { totalSpots?: number; holdbackSpots?: number },
  ) {
    // Location admins can only update their own locations
    if (userRole === 'LOCATION_ADMIN') {
      const loc = await this.prisma.location.findUnique({ where: { id: locationId } });
      if (!loc || loc.adminId !== userId) {
        throw new ForbiddenException('Not authorized for this location');
      }
    }

    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    return this.prisma.locationCapacity.upsert({
      where: {
        locationId_date: { locationId, date: targetDate },
      },
      update: data,
      create: {
        locationId,
        date: targetDate,
        totalSpots: data.totalSpots ?? 20,
        holdbackSpots: data.holdbackSpots ?? 2,
      },
    });
  }

  async getAdminLocations(userId: string) {
    return this.prisma.location.findMany({
      where: { adminId: userId },
      include: {
        capacities: {
          where: {
            date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
          },
          orderBy: { date: 'asc' },
          take: 2,
        },
      },
    });
  }

  async getTodayCapacity(locationId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.prisma.locationCapacity.findUnique({
      where: { locationId_date: { locationId, date: today } },
    });
  }
}
