-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('DRIVER', 'OPS', 'LOCATION_ADMIN', 'FLEET_ADMIN');
CREATE TYPE "ReservationStatus" AS ENUM ('HELD', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED', 'CANCELED', 'REASSIGNED', 'FAILED');
CREATE TYPE "CheckInType" AS ENUM ('ARRIVE', 'DEPART');
CREATE TYPE "IncidentType" AS ENUM ('ETA_DRIFT', 'CAPACITY_OVERFLOW', 'LOCATION_ISSUE', 'MANUAL_OVERRIDE', 'RESCUE_PROTOCOL');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "role" "UserRole" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateTable
CREATE TABLE "driver_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "home_base" TEXT,
    "carrier_name" TEXT,
    "eld_provider" TEXT,
    "hours_remaining" DOUBLE PRECISION NOT NULL DEFAULT 3.5,
    "duty_started_at" TIMESTAMP(3),
    CONSTRAINT "driver_profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "driver_profiles_user_id_key" ON "driver_profiles"("user_id");

-- CreateTable
CREATE TABLE "fleets" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fleets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fleet_memberships" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "fleet_id" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    CONSTRAINT "fleet_memberships_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "fleet_memberships_user_id_fleet_id_key" ON "fleet_memberships"("user_id", "fleet_id");

-- CreateTable
CREATE TABLE "corridors" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "geojson" JSONB,
    CONSTRAINT "corridors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "corridor_id" TEXT NOT NULL,
    "rules_json" JSONB,
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "reliability_score" DOUBLE PRECISION NOT NULL DEFAULT 0.95,
    "admin_id" TEXT,
    "order_in_corridor" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "location_capacities" (
    "id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "total_spots" INTEGER NOT NULL,
    "holdback_spots" INTEGER NOT NULL DEFAULT 2,
    "sold_spots" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "location_capacities_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "location_capacities_location_id_date_key" ON "location_capacities"("location_id", "date");

-- CreateTable
CREATE TABLE "reservations" (
    "id" TEXT NOT NULL,
    "driver_id" TEXT NOT NULL,
    "corridor_id" TEXT NOT NULL,
    "start_eta" TIMESTAMP(3) NOT NULL,
    "arrival_window_start" TIMESTAMP(3) NOT NULL,
    "arrival_window_end" TIMESTAMP(3) NOT NULL,
    "primary_location_id" TEXT NOT NULL,
    "backup_location_id" TEXT NOT NULL,
    "emergency_location_id" TEXT NOT NULL,
    "status" "ReservationStatus" NOT NULL DEFAULT 'HELD',
    "confirmation_code" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "reservations_confirmation_code_key" ON "reservations"("confirmation_code");

-- CreateTable
CREATE TABLE "check_in_events" (
    "id" TEXT NOT NULL,
    "reservation_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "CheckInType" NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    CONSTRAINT "check_in_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incidents" (
    "id" TEXT NOT NULL,
    "reservation_id" TEXT NOT NULL,
    "type" "IncidentType" NOT NULL,
    "notes" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rest_certificates" (
    "id" TEXT NOT NULL,
    "reservation_id" TEXT NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payload_json" JSONB NOT NULL,
    CONSTRAINT "rest_certificates_pkey" PRIMARY KEY ("id")
);

-- Foreign Keys
ALTER TABLE "driver_profiles" ADD CONSTRAINT "driver_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fleet_memberships" ADD CONSTRAINT "fleet_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fleet_memberships" ADD CONSTRAINT "fleet_memberships_fleet_id_fkey" FOREIGN KEY ("fleet_id") REFERENCES "fleets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "locations" ADD CONSTRAINT "locations_corridor_id_fkey" FOREIGN KEY ("corridor_id") REFERENCES "corridors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "locations" ADD CONSTRAINT "locations_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "location_capacities" ADD CONSTRAINT "location_capacities_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_corridor_id_fkey" FOREIGN KEY ("corridor_id") REFERENCES "corridors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_primary_location_id_fkey" FOREIGN KEY ("primary_location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_backup_location_id_fkey" FOREIGN KEY ("backup_location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_emergency_location_id_fkey" FOREIGN KEY ("emergency_location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "check_in_events" ADD CONSTRAINT "check_in_events_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "check_in_events" ADD CONSTRAINT "check_in_events_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rest_certificates" ADD CONSTRAINT "rest_certificates_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
