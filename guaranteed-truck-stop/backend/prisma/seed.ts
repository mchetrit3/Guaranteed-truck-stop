import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Check if already seeded
  const existingUsers = await prisma.user.count();
  if (existingUsers > 0) {
    console.log('Database already seeded, skipping.');
    return;
  }

  const hash = (pw: string) => bcrypt.hashSync(pw, 10);

  // ─── Users ───────────────────────────────────────────────
  const opsUser = await prisma.user.create({
    data: {
      email: 'ops@gts.demo',
      passwordHash: hash('demo1234'),
      name: 'Sam Operations',
      phone: '+15551000001',
      role: UserRole.OPS,
    },
  });

  const driver1 = await prisma.user.create({
    data: {
      email: 'driver1@gts.demo',
      passwordHash: hash('demo1234'),
      name: 'Mike Johnson',
      phone: '+15551000010',
      role: UserRole.DRIVER,
    },
  });

  const driver2 = await prisma.user.create({
    data: {
      email: 'driver2@gts.demo',
      passwordHash: hash('demo1234'),
      name: 'Sarah Williams',
      phone: '+15551000011',
      role: UserRole.DRIVER,
    },
  });

  const driver3 = await prisma.user.create({
    data: {
      email: 'driver3@gts.demo',
      passwordHash: hash('demo1234'),
      name: 'Carlos Rodriguez',
      phone: '+15551000012',
      role: UserRole.DRIVER,
    },
  });

  const locAdmin1 = await prisma.user.create({
    data: {
      email: 'loc1@gts.demo',
      passwordHash: hash('demo1234'),
      name: 'Tom LocationMgr',
      phone: '+15551000020',
      role: UserRole.LOCATION_ADMIN,
    },
  });

  const locAdmin2 = await prisma.user.create({
    data: {
      email: 'loc2@gts.demo',
      passwordHash: hash('demo1234'),
      name: 'Jane LocationMgr',
      phone: '+15551000021',
      role: UserRole.LOCATION_ADMIN,
    },
  });

  const fleetAdmin = await prisma.user.create({
    data: {
      email: 'fleet@gts.demo',
      passwordHash: hash('demo1234'),
      name: 'Fleet Manager',
      phone: '+15551000030',
      role: UserRole.FLEET_ADMIN,
    },
  });

  // ─── Driver Profiles ────────────────────────────────────
  await prisma.driverProfile.createMany({
    data: [
      { userId: driver1.id, homeBase: 'Boston, MA', carrierName: 'Northeast Express', eldProvider: 'KeepTruckin', hoursRemaining: 3.5 },
      { userId: driver2.id, homeBase: 'Hartford, CT', carrierName: 'Atlantic Freight', eldProvider: 'Samsara', hoursRemaining: 5.0 },
      { userId: driver3.id, homeBase: 'Newark, NJ', carrierName: 'Northeast Express', eldProvider: 'KeepTruckin', hoursRemaining: 2.0 },
    ],
  });

  // ─── Fleet ──────────────────────────────────────────────
  const fleet = await prisma.fleet.create({
    data: { name: 'Northeast Express' },
  });

  await prisma.fleetMembership.createMany({
    data: [
      { userId: fleetAdmin.id, fleetId: fleet.id, role: 'ADMIN' },
      { userId: driver1.id, fleetId: fleet.id, role: 'MEMBER' },
      { userId: driver3.id, fleetId: fleet.id, role: 'MEMBER' },
    ],
  });

  // ─── Corridor: I-95 Northeast ───────────────────────────
  const corridor = await prisma.corridor.create({
    data: {
      name: 'I-95 Northeast Corridor',
      description: 'Boston MA to Washington DC along Interstate 95',
      geojson: {
        type: 'LineString',
        coordinates: [
          [-71.0589, 42.3601], // Boston
          [-71.4128, 41.8240], // Providence
          [-72.6734, 41.7658], // Hartford area
          [-72.9279, 41.3083], // New Haven
          [-73.2044, 41.1130], // Bridgeport area
          [-73.9857, 40.7484], // NYC
          [-74.1724, 40.7357], // Newark
          [-74.7429, 40.2171], // Trenton area
          [-75.1652, 39.9526], // Philadelphia
          [-75.5277, 39.7391], // Wilmington
          [-76.6122, 39.2904], // Baltimore
          [-77.0369, 38.9072], // Washington DC
        ],
      },
    },
  });

  // ─── 12 Locations along I-95 ────────────────────────────
  const locations = [
    { name: 'Patriot Rest Stop', address: '1200 I-95 S, Walpole, MA 02081', lat: 42.0854, lng: -71.2495, order: 1, admin: locAdmin1.id },
    { name: 'Providence Truck Haven', address: '450 Branch Ave, Providence, RI 02904', lat: 41.8340, lng: -71.4201, order: 2, admin: null },
    { name: 'Connecticut Turnpike Plaza', address: '800 I-95, Madison, CT 06443', lat: 41.3555, lng: -72.5987, order: 3, admin: null },
    { name: 'Milford Service Area', address: '1400 Boston Post Rd, Milford, CT 06460', lat: 41.2265, lng: -73.0643, order: 4, admin: locAdmin1.id },
    { name: 'Cross Bronx Truck Stop', address: '2100 Cross Bronx Expy, Bronx, NY 10472', lat: 40.8296, lng: -73.8708, order: 5, admin: null },
    { name: 'Garden State Rest Area', address: '1500 NJ Turnpike, Woodbridge, NJ 07095', lat: 40.5468, lng: -74.2843, order: 6, admin: locAdmin2.id },
    { name: 'Turnpike Travel Center', address: '900 NJ Turnpike, Cranbury, NJ 08512', lat: 40.3153, lng: -74.5135, order: 7, admin: locAdmin2.id },
    { name: 'Delaware Valley Truck Port', address: '3200 I-95, Bristol, PA 19007', lat: 40.1209, lng: -74.8630, order: 8, admin: null },
    { name: 'Philly Gateway Stop', address: '7800 Essington Ave, Philadelphia, PA 19153', lat: 39.8823, lng: -75.2348, order: 9, admin: null },
    { name: 'Chesapeake House', address: '4200 I-95, Perryville, MD 21903', lat: 39.5770, lng: -76.0707, order: 10, admin: null },
    { name: 'Baltimore Truck Plaza', address: '6100 O\'Donnell St, Baltimore, MD 21224', lat: 39.2827, lng: -76.5540, order: 11, admin: locAdmin2.id },
    { name: 'Capital Region Rest Stop', address: '9500 I-95, Laurel, MD 20723', lat: 39.0968, lng: -76.8550, order: 12, admin: null },
  ];

  const createdLocations = [];
  for (const loc of locations) {
    const created = await prisma.location.create({
      data: {
        name: loc.name,
        address: loc.address,
        lat: loc.lat,
        lng: loc.lng,
        corridorId: corridor.id,
        orderInCorridor: loc.order,
        adminId: loc.admin,
        timezone: 'America/New_York',
        reliabilityScore: 0.9 + Math.random() * 0.1,
        rulesJson: {
          maxStayHours: 10,
          quietHoursStart: '22:00',
          quietHoursEnd: '06:00',
          amenities: ['restroom', 'fuel', 'food'],
        },
      },
    });
    createdLocations.push(created);
  }

  // ─── Capacity for today & tomorrow ──────────────────────
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const capacities = [25, 15, 20, 30, 10, 35, 25, 20, 30, 18, 22, 15];
  const holdbacks = [3, 2, 2, 4, 1, 4, 3, 2, 4, 2, 3, 2];

  for (let i = 0; i < createdLocations.length; i++) {
    for (const date of [today, tomorrow]) {
      await prisma.locationCapacity.create({
        data: {
          locationId: createdLocations[i].id,
          date,
          totalSpots: capacities[i],
          holdbackSpots: holdbacks[i],
          soldSpots: Math.floor(Math.random() * (capacities[i] - holdbacks[i] - 3)),
        },
      });
    }
  }

  // ─── Sample reservation ─────────────────────────────────
  const now = new Date();
  const eta = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours from now
  const windowStart = new Date(eta.getTime() - 30 * 60 * 1000);
  const windowEnd = new Date(eta.getTime() + 30 * 60 * 1000);

  await prisma.reservation.create({
    data: {
      driverId: driver1.id,
      corridorId: corridor.id,
      startEta: eta,
      arrivalWindowStart: windowStart,
      arrivalWindowEnd: windowEnd,
      primaryLocationId: createdLocations[3].id,
      backupLocationId: createdLocations[4].id,
      emergencyLocationId: createdLocations[5].id,
      status: 'CONFIRMED',
      confirmationCode: 'GTS-DEMO-001',
    },
  });

  await prisma.reservation.create({
    data: {
      driverId: driver2.id,
      corridorId: corridor.id,
      startEta: new Date(now.getTime() + 4 * 60 * 60 * 1000),
      arrivalWindowStart: new Date(now.getTime() + 3.5 * 60 * 60 * 1000),
      arrivalWindowEnd: new Date(now.getTime() + 4.5 * 60 * 60 * 1000),
      primaryLocationId: createdLocations[6].id,
      backupLocationId: createdLocations[7].id,
      emergencyLocationId: createdLocations[8].id,
      status: 'HELD',
      confirmationCode: 'GTS-DEMO-002',
    },
  });

  console.log('✅ Seed complete.');
  console.log('Demo accounts:');
  console.log('  driver1@gts.demo / demo1234 (DRIVER)');
  console.log('  driver2@gts.demo / demo1234 (DRIVER)');
  console.log('  driver3@gts.demo / demo1234 (DRIVER)');
  console.log('  ops@gts.demo / demo1234 (OPS)');
  console.log('  loc1@gts.demo / demo1234 (LOCATION_ADMIN)');
  console.log('  loc2@gts.demo / demo1234 (LOCATION_ADMIN)');
  console.log('  fleet@gts.demo / demo1234 (FLEET_ADMIN)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
