import { Controller, Get, Put, Body, UseGuards, Param } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  getMe(@CurrentUser() user: any) {
    return this.usersService.findById(user.id);
  }

  @Get('me/profile')
  @Roles('DRIVER')
  getMyProfile(@CurrentUser() user: any) {
    return this.usersService.findDriverProfile(user.id);
  }

  @Put('me/profile')
  @Roles('DRIVER')
  updateMyProfile(@CurrentUser() user: any, @Body() data: any) {
    return this.usersService.updateDriverProfile(user.id, data);
  }

  @Get('fleets')
  getMyFleets(@CurrentUser() user: any) {
    return this.usersService.getUserFleets(user.id);
  }

  @Get('fleets/:fleetId/members')
  @Roles('FLEET_ADMIN', 'OPS')
  getFleetMembers(@Param('fleetId') fleetId: string) {
    return this.usersService.getFleetMembers(fleetId);
  }
}
