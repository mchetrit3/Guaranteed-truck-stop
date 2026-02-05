import { Module } from '@nestjs/common';
import { PrismaModule } from './modules/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CorridorsModule } from './modules/corridors/corridors.module';
import { LocationsModule } from './modules/locations/locations.module';
import { ReservationsModule } from './modules/reservations/reservations.module';
import { CheckInModule } from './modules/check-in/check-in.module';
import { IncidentsModule } from './modules/incidents/incidents.module';
import { CertificatesModule } from './modules/certificates/certificates.module';
import { HosModule } from './modules/hos/hos.module';
import { AllocationModule } from './modules/allocation/allocation.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    CorridorsModule,
    LocationsModule,
    ReservationsModule,
    CheckInModule,
    IncidentsModule,
    CertificatesModule,
    HosModule,
    AllocationModule,
  ],
})
export class AppModule {}
