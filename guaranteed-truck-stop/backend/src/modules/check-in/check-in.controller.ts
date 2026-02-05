import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CheckInService } from './check-in.service';
import { IsString, IsNumber, IsEnum } from 'class-validator';

class DriverCheckInDto {
  @IsString()
  reservationId: string;

  @IsEnum(['ARRIVE', 'DEPART'])
  type: 'ARRIVE' | 'DEPART';

  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;
}

class LocationCheckInDto {
  @IsString()
  confirmationCode: string;

  @IsString()
  locationId: string;
}

@Controller('check-in')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class CheckInController {
  constructor(private checkInService: CheckInService) {}

  @Post('driver')
  @Roles('DRIVER')
  driverCheckIn(@Body() dto: DriverCheckInDto) {
    if (dto.type === 'ARRIVE') {
      return this.checkInService.arrive(dto.reservationId, dto.lat, dto.lng);
    }
    return this.checkInService.depart(dto.reservationId, dto.lat, dto.lng);
  }

  @Post('location')
  @Roles('LOCATION_ADMIN')
  locationCheckIn(@Body() dto: LocationCheckInDto) {
    return this.checkInService.markArrivedByCode(dto.confirmationCode, dto.locationId);
  }
}
