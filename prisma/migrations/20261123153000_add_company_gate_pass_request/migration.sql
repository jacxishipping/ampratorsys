-- These fields are already used by the Prisma client, including when loading
-- a container's shipments. Keep existing shipments unrequested by default.
ALTER TABLE "Shipment"
ADD COLUMN IF NOT EXISTS "companyGatePassRequested" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "companyGatePassRequestedAt" TIMESTAMP(3);
