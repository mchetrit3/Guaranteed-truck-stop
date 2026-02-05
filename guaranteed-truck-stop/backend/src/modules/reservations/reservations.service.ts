import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AllocationService } from '../allocation/allocation.service';
import { randomBytes } from 'crypto';
import { MockNotificationService } from '../notifications/mock-notification.service';

function generateConfirmationCode(): string {
  return 'GTS-' + randomBytes(3).toString('hex').toUpperCase();
}

@Injectable()
export class ReservationsService {
  private notifications = new MockNotificationService();

  constructor(
    private prisma: PrismaService,
    private allocation: AllocationService,
  ) {}

  async create(driverId: string, corridorId: string, startEta: string, preferredLocationId?: string, hoursRemaining?: number) {
    const eta = new Date(startEta);

    // Allocate primary + backup + emergency
    const result = await this.allocation.allocate(corridorId, eta, preferredLocationId, hoursRemaining);

    // Increment sold spots for primary
    await this.allocation.incrementSold(result.primaryLocationId);

    const reservation = await this.prisma.reservation.create({
      data: {
        driverId,
        corridorId,
        startEta: eta,
        arrivalWindowStart: result.arrivalWindowStart,
        arrivalWindowEnd: result.arrivalWindowEnd,
        primaryLocationId: result.primaryLocationId,
        backupLocationId: result.backupLocationId,
        emergencyLocationId: result.emergencyLocationId,
        status: 'CONFIRMED',
        confirmationCode: generateConfirmationCode(),
      },
      include: {
        primaryLocation: true,
        backupLocation: true,
        emergencyLocation: true,
        corridor: true,
        driver: { select: { id: true, name: true, phone: true, email: true } },
      },
    });

    // Mock notification
    this.notifications.send({
      to: reservation.driver.email,
      subject: 'GTS Reservation Confirmed',
      body: `Your stop at ${reservation.primaryLocation.name} is confirmed. Code: ${reservation.confirmationCode}`,
      channel: 'EMAIL',
    });

    return reservation;
  }

  async findById(id: string) {
    const res = await this.prisma.reservation.findUnique({
      where: { id },
      include: {
        primaryLocation: true,
        backupLocation: true,
        emergencyLocation: true,
        corridor: true,
        driver: { select: { id: true, name: true, phone: true, email: true } },
        checkInEvents: { orderBy: { ts: 'asc' } },
        incidents: { orderBy: { createdAt: 'desc' } },
        restCertificates: true,
      },
    });
    if (!res) throw new NotFoundException('Reservation not found');
    return res;
  }

  async findByCode(code: string) {
    const res = await this.prisma.reservation.findUnique({
      where: { confirmationCode: code },
      include: {
        primaryLocation: true,
        backupLocation: true,
        emergencyLocation: true,
        driver: { select: { id: true, name: true } },
      },
    });
    if (!res) throw new NotFoundException('Reservation not found');
    return res;
  }

  async findByDriver(driverId: string) {
    return this.prisma.reservation.findMany({
      where: { driverId },
      orderBy: { createdAt: 'desc' },
      include: {
        primaryLocation: true,
        backupLocation: true,
        emergencyLocation: true,
        corridor: true,
      },
    });
  }

  async findAll(filters?: { status?: string; corridorId?: string; locationId?: string }) {
    const where: any = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.corridorId) where.corridorId = filters.corridorId;
    if (filters?.locationId) where.primaryLocationId = filters.locationId;

    return this.prisma.reservation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        primaryLocation: true,
        backupLocation: true,
        emergencyLocation: true,
        corridor: true,
        driver: { select: { id: true, name: true, phone: true } },
        incidents: true,
      },
    });
  }

  async cancel(id: string, userId: string) {
    const res = await this.findById(id);
    if (res.status === 'CANCELED' || res.status === 'COMPLETED') {
      throw new BadRequestException('Cannot cancel this reservation');
    }

    // Release capacity
    await this.allocation.decrementSold(res.primaryLocationId);

    return this.prisma.reservation.update({
      where: { id },
      data: { status: 'CANCELED' },
    });
  }

  async reassign(id: string, targetLocationId: string, opsUserId: string, reason?: string) {
    const res = await this.findById(id);
    if (res.status === 'COMPLETED' || res.status === 'CANCELED') {
      throw new BadRequestException('Cannot reassign completed/canceled reservation');
    }

    // Release old capacity, claim new
    await this.allocation.decrementSold(res.primaryLocationId);
    await this.allocation.incrementSold(targetLocationId);

    // Create incident record
    await this.prisma.incident.create({
      data: {
        reservationId: id,
        type: 'MANUAL_OVERRIDE',
        notes: reason || `Reassigned from ${res.primaryLocation.name} to new location by ops`,
        createdById: opsUserId,
      },
    });

    return this.prisma.reservation.update({
      where: { id },
      data: {
        primaryLocationId: targetLocationId,
        status: 'REASSIGNED',
      },
      include: {
        primaryLocation: true,
        backupLocation: true,
        emergencyLocation: true,
      },
    });
  }

  async forceAddCapacity(locationId: string, opsUserId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.prisma.locationCapacity.upsert({
      where: { locationId_date: { locationId, date: today } },
      update: { totalSpots: { increment: 1 } },
      create: {
        locationId,
        date: today,
        totalSpots: 21,
        holdbackSpots: 2,
        soldSpots: 0,
      },
    });
  }

  async rescueProtocol(reservationId: string, opsUserId: string) {
    const res = await this.findById(reservationId);
    if (res.status === 'COMPLETED' || res.status === 'CANCELED') {
      throw new BadRequestException('Cannot rescue completed/canceled reservation');
    }

    // Try backup first, then emergency
    const backupHasCap = await this.allocation.hasCapacity(res.backupLocationId);
    const targetId = backupHasCap ? res.backupLocationId : res.emergencyLocationId;

    // Release old, claim new
    await this.allocation.decrementSold(res.primaryLocationId);
    await this.allocation.incrementSold(targetId);

    await this.prisma.incident.create({
      data: {
        reservationId,
        type: 'RESCUE_PROTOCOL',
        notes: `Auto-reassigned to ${backupHasCap ? 'backup' : 'emergency'} location due to ETA drift or capacity issue`,
        createdById: opsUserId,
      },
    });

    const newWindow = new Date();
    newWindow.setMinutes(newWindow.getMinutes() + 60);

    return this.prisma.reservation.update({
      where: { id: reservationId },
      data: {
        primaryLocationId: targetId,
        status: 'REASSIGNED',
        arrivalWindowEnd: newWindow,
      },
      include: {
        primaryLocation: true,
        backupLocation: true,
        emergencyLocation: true,
      },
    });
  }
}
