-- Migration: Add support for cover image in system settings
-- The COVER_IMAGE key will be stored in system_settings table
-- No schema changes needed, just documentation

-- Example of cover image setting:
-- INSERT INTO system_settings (id, key, value, updated_at)
-- VALUES (gen_random_uuid(), 'COVER_IMAGE', '{"coverImage": "/uploads/cover-123.jpg", "enabled": true}', NOW())
-- ON CONFLICT (key) DO NOTHING;
