import { Module } from '@nestjs/common';
import { HosService } from './hos.service';
import { HosController } from './hos.controller';

@Module({
  providers: [HosService],
  controllers: [HosController],
  exports: [HosService],
})
export class HosModule {}
