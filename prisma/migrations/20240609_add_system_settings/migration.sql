-- Add system settings table for global configurations
CREATE TABLE "system_settings" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "key" TEXT NOT NULL UNIQUE,
  "value" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Insert default main promo banner (disabled by default)
INSERT INTO "system_settings" ("id", "key", "value", "updatedAt")
VALUES (
  'cm000000-0000-0000-0000-000000000001',
  'MAIN_PROMO_BANNER',
  '{"enabled":false,"text":"🔥 Offre spéciale du jour !","textAr":"🔥 عرض خاص اليوم!","bgColor":"#FF6B00"}',
  CURRENT_TIMESTAMP
);
