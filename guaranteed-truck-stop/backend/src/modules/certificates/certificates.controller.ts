import { Controller, Get, Post, Param, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { CertificatesService } from './certificates.service';

@Controller('certificates')
@UseGuards(AuthGuard('jwt'))
export class CertificatesController {
  constructor(private certificatesService: CertificatesService) {}

  @Post('generate/:reservationId')
  generate(@Param('reservationId') reservationId: string) {
    return this.certificatesService.generate(reservationId);
  }

  @Get(':id')
  getCertificate(@Param('id') id: string) {
    return this.certificatesService.getCertificate(id);
  }

  @Get(':id/pdf')
  async downloadPdf(@Param('id') id: string, @Res() res: Response) {
    const buffer = await this.certificatesService.generatePdf(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=rest-certificate-${id}.pdf`,
      'Content-Length': buffer.length,
    });
    res.send(buffer);
  }

  @Get('reservation/:reservationId')
  findByReservation(@Param('reservationId') reservationId: string) {
    return this.certificatesService.findByReservation(reservationId);
  }
}
