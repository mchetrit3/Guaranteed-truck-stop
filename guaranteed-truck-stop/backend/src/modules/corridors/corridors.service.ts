import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CorridorsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.corridor.findMany({
      include: {
        locations: { orderBy: { orderInCorridor: 'asc' } },
      },
    });
  }

  async findById(id: string) {
    return this.prisma.corridor.findUnique({
      where: { id },
      include: {
        locations: {
          orderBy: { orderInCorridor: 'asc' },
          include: {
            capacities: {
              where: {
                date: {
                  gte: new Date(new Date().setHours(0, 0, 0, 0)),
                },
              },
              orderBy: { date: 'asc' },
              take: 2,
            },
          },
        },
      },
    });
  }
}
