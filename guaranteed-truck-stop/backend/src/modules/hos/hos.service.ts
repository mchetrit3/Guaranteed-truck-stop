import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Simplified HOS (Hours of Service) model for beta.
 *
 * In production, this would integrate with ELD providers (KeepTruckin, Samsara, etc.)
 * and implement full FMCSA HOS rules (11-hour driving limit, 14-hour on-duty limit,
 * 30-minute break requirement, etc.)
 *
 * BETA: Uses a simple "hours_remaining_today" field from DriverProfile.
 * Extension point: Replace with ELD API integration.
 */
@Injectable()
export class HosService {
  constructor(private prisma: PrismaService) {}

  async getDriverHos(userId: string) {
    const profile = await this.prisma.driverProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return {
        hoursRemaining: parseFloat(process.env.DEFAULT_HOS_HOURS_REMAINING || '3.5'),
        minutesRemaining: parseFloat(process.env.DEFAULT_HOS_HOURS_REMAINING || '3.5') * 60,
        latestStopTime: new Date(Date.now() + 3.5 * 60 * 60 * 1000).toISOString(),
        source: 'DEFAULT',
        disclaimer: 'BETA: Mock HOS data. Not for compliance use.',
      };
    }

    const hoursRemaining = profile.hoursRemaining;
    const minutesRemaining = hoursRemaining * 60;
    const latestStopTime = new Date(Date.now() + hoursRemaining * 60 * 60 * 1000);

    return {
      hoursRemaining,
      minutesRemaining,
      latestStopTime: latestStopTime.toISOString(),
      source: profile.eldProvider || 'MANUAL',
      dutyStartedAt: profile.dutyStartedAt?.toISOString() || null,
      disclaimer: 'BETA: Mock HOS data. Not for compliance use.',
    };
  }

  async updateHoursRemaining(userId: string, hours: number) {
    return this.prisma.driverProfile.update({
      where: { userId },
      data: {
        hoursRemaining: hours,
        dutyStartedAt: new Date(),
      },
    });
  }
}
