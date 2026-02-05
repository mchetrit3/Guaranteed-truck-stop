import { Module } from '@nestjs/common';
import { CorridorsService } from './corridors.service';
import { CorridorsController } from './corridors.controller';

@Module({
  providers: [CorridorsService],
  controllers: [CorridorsController],
  exports: [CorridorsService],
})
export class CorridorsModule {}
