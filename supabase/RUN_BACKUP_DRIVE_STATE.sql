-- =============================================================================
-- CITYMO — À coller dans Supabase SQL Editor si la migration n’est pas appliquée
-- Identique à migrations/20260724160000_erp_backup_drive_state.sql
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.erp_backup_drive_state (
  id                smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  auth_mode         text,
  folder_id         text,
  shared_drive_id   text,
  last_check_at     timestamptz,
  last_upload_at    timestamptz,
  status            text NOT NULL DEFAULT 'unknown',
  error             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  last_error_code           text,
  last_error_user_message   text,
  last_success_at           timestamptz,
  connected_account         text,
  oauth_refresh_token       text,
  notify_reconnect_sent_at  timestamptz
);

ALTER TABLE public.erp_backup_drive_state
  ADD COLUMN IF NOT EXISTS auth_mode text,
  ADD COLUMN IF NOT EXISTS folder_id text,
  ADD COLUMN IF NOT EXISTS shared_drive_id text,
  ADD COLUMN IF NOT EXISTS last_check_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_upload_at timestamptz,
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS error text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS last_error_code text,
  ADD COLUMN IF NOT EXISTS last_error_user_message text,
  ADD COLUMN IF NOT EXISTS last_success_at timestamptz,
  ADD COLUMN IF NOT EXISTS connected_account text,
  ADD COLUMN IF NOT EXISTS oauth_refresh_token text,
  ADD COLUMN IF NOT EXISTS notify_reconnect_sent_at timestamptz;

UPDATE public.erp_backup_drive_state
SET status = COALESCE(NULLIF(TRIM(status), ''), 'unknown')
WHERE status IS NULL;

INSERT INTO public.erp_backup_drive_state (id, status, created_at, updated_at)
VALUES (1, 'unknown', now(), now())
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.erp_backup_schedules
  ADD COLUMN IF NOT EXISTS last_period_key text,
  ADD COLUMN IF NOT EXISTS consecutive_failures integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_error_code text,
  ADD COLUMN IF NOT EXISTS last_error_user_message text;

ALTER TABLE public.erp_backups
  ADD COLUMN IF NOT EXISTS user_message text,
  ADD COLUMN IF NOT EXISTS error_code text,
  ADD COLUMN IF NOT EXISTS schedule_period_key text,
  ADD COLUMN IF NOT EXISTS steps_json jsonb;

ALTER TABLE public.erp_backup_drive_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS erp_backup_drive_state_super ON public.erp_backup_drive_state;
CREATE POLICY erp_backup_drive_state_super ON public.erp_backup_drive_state
  FOR ALL
  USING (
    (SELECT auth.role()) = 'service_role'
    OR public.is_super_admin()
  )
  WITH CHECK (
    (SELECT auth.role()) = 'service_role'
    OR public.is_super_admin()
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.erp_backup_drive_state TO service_role;
GRANT SELECT ON public.erp_backup_drive_state TO authenticated;

NOTIFY pgrst, 'reload schema';
