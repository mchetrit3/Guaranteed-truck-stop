import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { HosService } from './hos.service';

@Controller('hos')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class HosController {
  constructor(private hosService: HosService) {}

  @Get()
  @Roles('DRIVER')
  getMyHos(@CurrentUser() user: any) {
    return this.hosService.getDriverHos(user.id);
  }

  @Put()
  @Roles('DRIVER')
  updateHours(@CurrentUser() user: any, @Body() data: { hoursRemaining: number }) {
    return this.hosService.updateHoursRemaining(user.id, data.hoursRemaining);
  }
}
