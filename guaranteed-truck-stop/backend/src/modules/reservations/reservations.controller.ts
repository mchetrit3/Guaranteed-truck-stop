import { Controller, Get, Post, Put, Param, Body, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ReservationsService } from './reservations.service';
import { IsString, IsOptional, IsNumber } from 'class-validator';

class CreateReservationDto {
  @IsString()
  corridorId: string;

  @IsString()
  startEta: string;

  @IsOptional()
  @IsString()
  preferredLocationId?: string;

  @IsOptional()
  @IsNumber()
  hoursRemaining?: number;
}

class ReassignDto {
  @IsString()
  targetLocationId: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

@Controller('reservations')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ReservationsController {
  constructor(private reservationsService: ReservationsService) {}

  @Post()
  @Roles('DRIVER')
  create(@CurrentUser() user: any, @Body() dto: CreateReservationDto) {
    return this.reservationsService.create(
      user.id,
      dto.corridorId,
      dto.startEta,
      dto.preferredLocationId,
      dto.hoursRemaining,
    );
  }

  @Get()
  findAll(
    @Query('status') status?: string,
    @Query('corridorId') corridorId?: string,
    @Query('locationId') locationId?: string,
  ) {
    return this.reservationsService.findAll({ status, corridorId, locationId });
  }

  @Get('mine')
  @Roles('DRIVER')
  findMine(@CurrentUser() user: any) {
    return this.reservationsService.findByDriver(user.id);
  }

  @Get('code/:code')
  findByCode(@Param('code') code: string) {
    return this.reservationsService.findByCode(code);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.reservationsService.findById(id);
  }

  @Put(':id/cancel')
  cancel(@Param('id') id: string, @CurrentUser() user: any) {
    return this.reservationsService.cancel(id, user.id);
  }

  @Put(':id/reassign')
  @Roles('OPS')
  reassign(@Param('id') id: string, @Body() dto: ReassignDto, @CurrentUser() user: any) {
    return this.reservationsService.reassign(id, dto.targetLocationId, user.id, dto.reason);
  }

  @Put(':id/rescue')
  @Roles('OPS')
  rescue(@Param('id') id: string, @CurrentUser() user: any) {
    return this.reservationsService.rescueProtocol(id, user.id);
  }

  @Put('locations/:locationId/force-capacity')
  @Roles('OPS')
  forceCapacity(@Param('locationId') locationId: string, @CurrentUser() user: any) {
    return this.reservationsService.forceAddCapacity(locationId, user.id);
  }
}
