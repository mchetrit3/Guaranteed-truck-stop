import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { IncidentsService } from './incidents.service';
import { IsString, IsEnum } from 'class-validator';

class CreateIncidentDto {
  @IsString()
  reservationId: string;

  @IsString()
  type: string;

  @IsString()
  notes: string;
}

@Controller('incidents')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class IncidentsController {
  constructor(private incidentsService: IncidentsService) {}

  @Post()
  @Roles('OPS', 'LOCATION_ADMIN')
  create(@Body() dto: CreateIncidentDto, @CurrentUser() user: any) {
    return this.incidentsService.create(dto.reservationId, dto.type as any, dto.notes, user.id);
  }

  @Get()
  @Roles('OPS')
  findAll(@Query('limit') limit?: number) {
    return this.incidentsService.findAll(limit);
  }

  @Get('reservation/:reservationId')
  findByReservation(@Param('reservationId') reservationId: string) {
    return this.incidentsService.findByReservation(reservationId);
  }
}
