import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { driverProfile: true },
    });
  }

  async findDriverProfile(userId: string) {
    return this.prisma.driverProfile.findUnique({ where: { userId } });
  }

  async updateDriverProfile(userId: string, data: { hoursRemaining?: number; homeBase?: string; carrierName?: string; eldProvider?: string }) {
    return this.prisma.driverProfile.update({
      where: { userId },
      data,
    });
  }

  async getFleetMembers(fleetId: string) {
    return this.prisma.fleetMembership.findMany({
      where: { fleetId },
      include: {
        user: {
          include: { driverProfile: true },
        },
      },
    });
  }

  async getUserFleets(userId: string) {
    return this.prisma.fleetMembership.findMany({
      where: { userId },
      include: { fleet: true },
    });
  }
}
