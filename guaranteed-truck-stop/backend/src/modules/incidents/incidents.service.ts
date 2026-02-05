import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IncidentType } from '@prisma/client';

@Injectable()
export class IncidentsService {
  constructor(private prisma: PrismaService) {}

  async create(reservationId: string, type: IncidentType, notes: string, createdById: string) {
    return this.prisma.incident.create({
      data: {
        reservationId,
        type,
        notes,
        createdById,
      },
      include: {
        reservation: { include: { primaryLocation: true, driver: { select: { name: true } } } },
        createdBy: { select: { name: true } },
      },
    });
  }

  async findByReservation(reservationId: string) {
    return this.prisma.incident.findMany({
      where: { reservationId },
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: { select: { name: true } },
      },
    });
  }

  async findAll(limit = 50) {
    return this.prisma.incident.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        reservation: {
          include: {
            primaryLocation: true,
            driver: { select: { name: true } },
          },
        },
        createdBy: { select: { name: true } },
      },
    });
  }
}
