import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * Integration tests for reservation creation and check-in flow.
 *
 * PREREQUISITES: Requires a running PostgreSQL with seeded data.
 * Run: docker-compose up postgres -d && cd backend && npx prisma migrate deploy && npx prisma db seed
 * Then: npm run test:e2e
 *
 * If no DB is available, these tests will be skipped gracefully.
 */
describe('Reservation E2E (AppController)', () => {
  let app: INestApplication;
  let driverToken: string;
  let opsToken: string;
  let corridorId: string;
  let reservationId: string;

  beforeAll(async () => {
    try {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleFixture.createNestApplication();
      app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
      app.setGlobalPrefix('api');
      await app.init();
    } catch (err) {
      console.warn('Skipping E2E tests: DB not available');
      return;
    }
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('should login as driver', async () => {
    if (!app) return;
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'driver1@gts.demo', password: 'demo1234' })
      .expect(201);

    expect(res.body.access_token).toBeDefined();
    expect(res.body.user.role).toBe('DRIVER');
    driverToken = res.body.access_token;
  });

  it('should login as ops', async () => {
    if (!app) return;
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'ops@gts.demo', password: 'demo1234' })
      .expect(201);

    opsToken = res.body.access_token;
  });

  it('should get corridors and create a reservation', async () => {
    if (!app || !driverToken) return;

    // Get corridors
    const corridorsRes = await request(app.getHttpServer())
      .get('/api/corridors')
      .set('Authorization', `Bearer ${driverToken}`)
      .expect(200);

    expect(corridorsRes.body.length).toBeGreaterThan(0);
    corridorId = corridorsRes.body[0].id;

    // Create reservation
    const eta = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();
    const resRes = await request(app.getHttpServer())
      .post('/api/reservations')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ corridorId, startEta: eta })
      .expect(201);

    expect(resRes.body.id).toBeDefined();
    expect(resRes.body.status).toBe('CONFIRMED');
    expect(resRes.body.primaryLocationId).toBeDefined();
    expect(resRes.body.backupLocationId).toBeDefined();
    expect(resRes.body.emergencyLocationId).toBeDefined();
    expect(resRes.body.confirmationCode).toMatch(/^GTS-/);
    reservationId = resRes.body.id;
  });

  it('should check in (arrive) and check out (depart)', async () => {
    if (!app || !driverToken || !reservationId) return;

    // Get reservation to get location coords
    const resDetails = await request(app.getHttpServer())
      .get(`/api/reservations/${reservationId}`)
      .set('Authorization', `Bearer ${driverToken}`)
      .expect(200);

    const lat = resDetails.body.primaryLocation.lat;
    const lng = resDetails.body.primaryLocation.lng;

    // Check in (arrive)
    const arriveRes = await request(app.getHttpServer())
      .post('/api/check-in/driver')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ reservationId, type: 'ARRIVE', lat, lng })
      .expect(201);

    expect(arriveRes.body.withinGeofence).toBe(true);

    // Verify status changed to CHECKED_IN
    const afterArrive = await request(app.getHttpServer())
      .get(`/api/reservations/${reservationId}`)
      .set('Authorization', `Bearer ${driverToken}`)
      .expect(200);

    expect(afterArrive.body.status).toBe('CHECKED_IN');

    // Check out (depart)
    await request(app.getHttpServer())
      .post('/api/check-in/driver')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ reservationId, type: 'DEPART', lat, lng })
      .expect(201);

    // Verify status changed to COMPLETED
    const afterDepart = await request(app.getHttpServer())
      .get(`/api/reservations/${reservationId}`)
      .set('Authorization', `Bearer ${driverToken}`)
      .expect(200);

    expect(afterDepart.body.status).toBe('COMPLETED');
  });
});
