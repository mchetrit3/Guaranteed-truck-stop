import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CorridorsService } from './corridors.service';

@Controller('corridors')
@UseGuards(AuthGuard('jwt'))
export class CorridorsController {
  constructor(private corridorsService: CorridorsService) {}

  @Get()
  findAll() {
    return this.corridorsService.findAll();
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.corridorsService.findById(id);
  }
}
