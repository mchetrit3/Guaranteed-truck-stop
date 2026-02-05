import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as PDFDocument from 'pdfkit';

@Injectable()
export class CertificatesService {
  constructor(private prisma: PrismaService) {}

  async generate(reservationId: string) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        driver: true,
        primaryLocation: true,
        corridor: true,
        checkInEvents: { orderBy: { ts: 'asc' } },
      },
    });

    if (!reservation) throw new NotFoundException('Reservation not found');
    if (reservation.status !== 'COMPLETED') {
      throw new BadRequestException('Reservation must be completed to generate certificate');
    }

    const arriveEvent = reservation.checkInEvents.find((e) => e.type === 'ARRIVE');
    const departEvent = reservation.checkInEvents.find((e) => e.type === 'DEPART');

    if (!arriveEvent || !departEvent) {
      throw new BadRequestException('Missing check-in/check-out events');
    }

    const restDurationMs = departEvent.ts.getTime() - arriveEvent.ts.getTime();
    const restDurationMinutes = Math.round(restDurationMs / 60000);

    const payload = {
      reservationId: reservation.id,
      confirmationCode: reservation.confirmationCode,
      driverName: reservation.driver.name,
      driverId: reservation.driver.id,
      locationName: reservation.primaryLocation.name,
      locationAddress: reservation.primaryLocation.address,
      corridorName: reservation.corridor.name,
      arrivalTime: arriveEvent.ts.toISOString(),
      departureTime: departEvent.ts.toISOString(),
      restDurationMinutes,
      arrivalLat: arriveEvent.lat,
      arrivalLng: arriveEvent.lng,
      disclaimer: 'BETA: This is an informational record only. Not a legal compliance document.',
    };

    const cert = await this.prisma.restCertificate.create({
      data: {
        reservationId,
        payloadJson: payload,
      },
    });

    return { certificate: cert, payload };
  }

  async getCertificate(id: string) {
    const cert = await this.prisma.restCertificate.findUnique({
      where: { id },
    });
    if (!cert) throw new NotFoundException('Certificate not found');
    return cert;
  }

  async generatePdf(id: string): Promise<Buffer> {
    const cert = await this.getCertificate(id);
    const payload = cert.payloadJson as any;

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(20).text('Guaranteed Truck Stop', { align: 'center' });
      doc.fontSize(14).text('Rest Event Certificate', { align: 'center' });
      doc.moveDown();

      // Divider
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown();

      // Details
      doc.fontSize(12);
      doc.text(`Confirmation Code: ${payload.confirmationCode}`);
      doc.text(`Driver: ${payload.driverName}`);
      doc.text(`Location: ${payload.locationName}`);
      doc.text(`Address: ${payload.locationAddress}`);
      doc.text(`Corridor: ${payload.corridorName}`);
      doc.moveDown();

      doc.text(`Arrival: ${new Date(payload.arrivalTime).toLocaleString()}`);
      doc.text(`Departure: ${new Date(payload.departureTime).toLocaleString()}`);
      doc.text(`Rest Duration: ${payload.restDurationMinutes} minutes`);
      doc.moveDown();

      doc.text(`Arrival Coordinates: ${payload.arrivalLat}, ${payload.arrivalLng}`);
      doc.moveDown(2);

      // Divider
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown();

      // Footer disclaimer
      doc.fontSize(9).fillColor('red');
      doc.text(payload.disclaimer, { align: 'center' });
      doc.moveDown();
      doc.fillColor('gray').fontSize(8);
      doc.text(`Generated: ${new Date().toISOString()}`, { align: 'center' });
      doc.text(`Certificate ID: ${cert.id}`, { align: 'center' });

      doc.end();
    });
  }

  async findByReservation(reservationId: string) {
    return this.prisma.restCertificate.findMany({
      where: { reservationId },
      orderBy: { generatedAt: 'desc' },
    });
  }
}
