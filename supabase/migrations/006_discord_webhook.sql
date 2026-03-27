-- Discord webhooks replace Slack; run after 005_user_settings.sql.
-- Safe to re-run.

ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS discord_webhook text;

ALTER TABLE user_settings DROP COLUMN IF EXISTS slack_webhook;
