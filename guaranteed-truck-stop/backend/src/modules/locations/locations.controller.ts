import { Controller, Get, Param, Put, Body, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { LocationsService } from './locations.service';

@Controller('locations')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class LocationsController {
  constructor(private locationsService: LocationsService) {}

  @Get()
  findAll(@Query('corridorId') corridorId?: string) {
    return this.locationsService.findAll(corridorId);
  }

  @Get('mine')
  @Roles('LOCATION_ADMIN')
  getMyLocations(@CurrentUser() user: any) {
    return this.locationsService.getAdminLocations(user.id);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.locationsService.findById(id);
  }

  @Get(':id/reservations')
  getReservations(@Param('id') id: string, @Query('date') date?: string) {
    return this.locationsService.getReservationsForLocation(id, date);
  }

  @Put(':id/capacity')
  @Roles('LOCATION_ADMIN', 'OPS')
  updateCapacity(
    @Param('id') id: string,
    @Query('date') date: string,
    @CurrentUser() user: any,
    @Body() data: { totalSpots?: number; holdbackSpots?: number },
  ) {
    return this.locationsService.updateCapacity(id, date, user.id, user.role, data);
  }
}
